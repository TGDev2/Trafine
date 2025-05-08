import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import RouteMap from "./RouteMap";
import { geocode } from "../utils/geocode";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../utils/api";
import "../style/routeCalculator.css";

// Fonction de traduction des instructions
function translateInstruction(instr) {
  return instr
    .replace("Head southwest", "Prendre la direction sud-ouest")
    .replace("Head northeast", "Prendre la direction nord-est")
    .replace("Head north", "Prendre la direction nord")
    .replace("Head south", "Prendre la direction sud")
    .replace("Head east", "Prendre la direction est")
    .replace("Head west", "Prendre la direction ouest")
    .replace("Turn right", "Tourner à droite")
    .replace("Turn left", "Tourner à gauche")
    .replace("Keep left", "Rester à gauche")
    .replace("Keep right", "Rester à droite")
    .replace("Continue", "Continuer")
    .replace("onto", "sur")
    .replace("at", "à")
    .replace("the roundabout", "au rond-point")
    .replace("Take the exit", "Prendre la sortie")
    .replace("Continue straight", "Continuer tout droit")
    .replace("Continue onto", "Continuer sur")
    .replace("Continue on", "Continuer sur")
    .replace("Turn slight left", "Tourner légèrement à gauche")
    .replace("Turn slight right", "Tourner légèrement à droite")
    .replace("Turn sharp left", "Tourner à gauche")
    .replace("Turn sharp right", "Tourner à droite")
    .replace("Continue straight onto", "Continuer tout droit sur")
    .replace("Continue straight on", "Continuer tout droit sur")
    .replace("Continue straight ahead", "Continuer tout droit")
    .replace("Continue straight", "Continuer tout droit")
    .replace("Continue along", "Continuer le long de")
    .replace("Continue for", "Continuer pendant")
    .replace("and continue", "et continuer")
    .replace("exit", "sortie")
    .replace("arrive", "arrivée")
    .replace("arrive at", "arrivée à")
    .replace("arrive at the", "arrivée à")
    .replace("take the", "prendre la")
    .replace(" 1rst", " première")
    .replace(" 2nd", " deuxième")
    .replace(" 3rd", " troisième")
    .replace(" 4th", " quatrième")
    .replace(" 5th", " cinquième")
    .replace(" 6th", " sixième")
    .replace("on the left", "sur la gauche")
   .replace("on the right", "sur la droite")
   .replace("at the end of", "à la fin de")
   .replace("at the end", "à la fin");
}

function RouteCalculator({ socket }) {
  // ---------------------------  State  ---------------------------
  const [sourceInput, setSourceInput] = useState("");
  const [destinationInput, setDestinationInput] = useState("");
  const [sourceCoords, setSourceCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [routes, setRoutes] = useState(null);

  // États pour le partage QR Code
  const [qrCode, setQrCode] = useState(null);
  const [shareId, setShareId] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [pushLoading, setPushLoading] = useState(false);
  const [pushMessage, setPushMessage] = useState(null);

  const { token, refreshToken, refreshSession, logout } = useAuth();
  const navigate = useNavigate();

  // ---------------------------------------------------------------
  //  Calcul d’itinéraire (extrait dans une callback réutilisable)
  // ---------------------------------------------------------------
  const handleCalculateRoute = useCallback(
    async ({ silent = false } = {}) => {
      const coordRegex = /^-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+$/;
      if (!silent) {
        setLoading(true);
        setError(null);
        setRoutes(null);
      }
      try {
        // Résolution des coordonnées
        const src = coordRegex.test(sourceInput)
          ? sourceInput
          : await geocode(sourceInput);
        const dst = coordRegex.test(destinationInput)
          ? destinationInput
          : await geocode(destinationInput);

        setSourceCoords(src);
        setDestCoords(dst);

        const response = await fetch(
          "http://localhost:3000/navigation/calculate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source: src, destination: dst, avoidTolls }),
          }
        );
        // Correction : gestion d'erreur serveur
        if (!response.ok) {
          const text = await response.text();
          throw new Error(
            `Erreur lors du calcul d'itinéraire (${response.status}): ${text}`
          );
        }

        const data = await response.json();
        const calculatedRoutes = data.routes || [];
        setRoutes(calculatedRoutes);

        // (Re)abonnement pour la première alternative
        if (socket && calculatedRoutes.length > 0) {
          const firstGeometry = calculatedRoutes[0].geometry;
          if (firstGeometry?.type === "LineString") {
            socket.emit("subscribeRoute", {
              geometry: {
                type: "Feature",
                geometry: firstGeometry,
                properties: {},
              },
              threshold: 1000,
            });
          }
        }
      } catch (err) {
        if (!silent) setError(err.message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [sourceInput, destinationInput, avoidTolls, socket]
  );

  // ----------------------------------------------
  //  Recalcul automatique sur « incidentAlert »
  // ---------------------------------------------
  useEffect(() => {
    if (!socket) return;
    let lastRun = 0;
    const THROTTLE_MS = 10_000;

    const onIncidentAlert = () => {
      const now = Date.now();
      if (routes && now - lastRun >= THROTTLE_MS) {
        lastRun = now;
        handleCalculateRoute({ silent: true });
      }
    };

    socket.on("incidentAlert", onIncidentAlert);
    return () => socket.off("incidentAlert", onIncidentAlert);
  }, [socket, routes, handleCalculateRoute]);

  // --------------------------  QR Share  --------------------------
  const handleShare = async () => {
    if (!sourceCoords || !destCoords) {
      setError("Vous devez d’abord calculer un itinéraire valide.");
      return;
    }
    setQrLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:3000/navigation/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: sourceCoords,
          destination: destCoords,
          avoidTolls,
        }),
      });
      if (!response.ok)
        throw new Error("Erreur lors de la génération du QR code");

      const data = await response.json();
      setQrCode(data.qrCode);
      setShareId(data.shareId);
    } catch (err) {
      setError(err.message);
    } finally {
      setQrLoading(false);
    }
  };

  // Envoi direct de l’itinéraire au mobile via l’API /navigation/push
  const handlePush = async () => {
    if (!sourceCoords || !destCoords) {
      setError("Vous devez d’abord calculer un itinéraire valide.");
      return;
    }
    setPushLoading(true);
    setError(null);
    setPushMessage(null);

    try {
      const res = await apiFetch(
        "http://localhost:3000/navigation/push",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: sourceCoords,
            destination: destCoords,
            avoidTolls,
          }),
        },
        { token, refreshToken, refreshSession, logout }
      );
      if (!res.ok) throw new Error("Erreur lors de l'envoi vers le mobile");
      const { alternatives } = await res.json();
      setPushMessage(
        `Itinéraire envoyé – ${alternatives} alternatives transférées.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setPushLoading(false);
    }
  };

  // --------------------------  Render  ----------------------------
  return (
    <div className="route-calc-container">
      <button
        type="button"
        onClick={() => navigate("/")}
        style={{
          marginBottom: "18px",
          background: "#eee",
          color: "#2c3e50",
          border: "none",
          borderRadius: "6px",
          padding: "8px 16px",
          cursor: "pointer",
          fontWeight: 500,
        }}
      >
        ← Retour aux incidents
      </button>
      <h2>Calculateur d’itinéraire</h2>

      {/* -------  Formulaire ------- */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleCalculateRoute();
        }}
      >
        {/* Source */}
        <div>
          <label style={{ marginRight: "10px" }}>Point de départ :</label>
          <input
            type="text"
            value={sourceInput}
            onChange={(e) => setSourceInput(e.target.value)}
            required
            placeholder="Ex : Paris ou 48.8566, 2.3522"
          />
        </div>

        {/* Destination */}
        <div>
          <label style={{ marginRight: "10px" }}>Destination :</label>
          <input
            type="text"
            value={destinationInput}
            onChange={(e) => setDestinationInput(e.target.value)}
            required
            placeholder="Ex : Lyon ou 45.7640, 4.8357"
          />
        </div>

        {/* Options */}
        <div>
          <label>
            <input
              type="checkbox"
              checked={avoidTolls}
              onChange={(e) => setAvoidTolls(e.target.checked)}
              style={{ marginRight: "5px" }}
            />
            Éviter les péages
          </label>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Calcul en cours…" : "Calculer"}
        </button>
      </form>

      {error && <p className="error-msg">Erreur : {error}</p>}

      {/* -------  Résultats ------- */}
      {routes && routes.length > 0 && (
        <div className="route-result">
          <RouteMap routes={routes} />
          <h3>Itinéraire(s) calculé(s)</h3>
          {routes.map((rt, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: "15px",
                border: "1px solid #ccc",
                padding: "10px",
                borderRadius: "4px",
              }}
            >
              <p>
                <strong>Distance :</strong> {rt.distance}
              </p>
              <p>
                <strong>Durée :</strong> {rt.duration}
              </p>
              <p>
                <strong>Type :</strong>{" "}
                {rt.recalculated ? "Recalculé" : "Optimal"}
              </p>
              <p>
                <strong>Instructions :</strong>
              </p>
              <ul>
                {rt.instructions.map((instr, i) => (
                  <li key={i}>{translateInstruction(instr)}</li>
                ))}
              </ul>
            </div>
          ))}

          <button
            onClick={handlePush}
            disabled={pushLoading}
            style={{
              marginTop: "10px",
              padding: "8px 12px",
              marginRight: "10px",
            }}
          >
            {pushLoading ? "Envoi en cours…" : "Envoyer sur mobile"}
          </button>
          {pushMessage && <p className="success-msg">{pushMessage}</p>}

          <button
            onClick={handleShare}
            disabled={qrLoading}
            style={{ marginTop: "10px", padding: "8px 12px" }}
          >
            {qrLoading ? "Génération du QR code…" : "Partager l’itinéraire"}
          </button>
        </div>
      )}

      {/* -------  QR code de partage ------- */}
      {qrCode && (
        <div className="qr-section">
          <h4>QR code de partage</h4>
          <img src={qrCode} alt="QR code itinéraire" />
          {shareId && (
            <p>
              Lien de partage :{" "}
              <a
                href={`/share/${shareId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {window.location.origin}/share/{shareId}
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default RouteCalculator;
