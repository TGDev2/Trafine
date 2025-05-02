import React, { useState, useEffect, useCallback } from "react";
import RouteMap from "./RouteMap";
import { geocode } from "../utils/geocode";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../utils/api";

/**
 * @param {{socket?: import("socket.io-client").Socket}} props
 */
function RouteCalculator({ socket }) {
  /* ---------------------------  State  --------------------------- */
  const [sourceInput, setSourceInput] = useState("");
  const [destinationInput, setDestinationInput] = useState("");
  const [sourceCoords, setSourceCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [routes, setRoutes] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMessage, setPushMessage] = useState(null);

  const { token, refreshToken, refreshSession, logout } = useAuth();

  /* --------------------------------------------------------------- */
  /*  Calcul d’itinéraire (extrait dans une callback réutilisable)   */
  /* --------------------------------------------------------------- */
  const handleCalculateRoute = useCallback(
    async ({ silent = false } = {}) => {
      const coordRegex = /^-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+$/;
      if (!silent) {
        setLoading(true);
        setError(null);
        setRoutes(null);
      }
      try {
        // Résolution des coordonnées (inline pour satisfaire exhaustive-deps)
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
        if (!response.ok) throw new Error("Erreur lors du calcul d'itinéraire");

        const data = await response.json();
        const calculatedRoutes = data.routes || [];
        setRoutes(calculatedRoutes);

        /* (Re)abonnement pour la première alternative */
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

  /* ----------------------------------------------
   *  Recalcul automatique sur « incidentAlert »
   *  – throttlé (1 exécution max toutes les 10 s)
   * --------------------------------------------- */
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

  /* --------------------------  QR Share  -------------------------- */
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
        throw new Error("Erreur lors de la génération du QR code");
      const data = await response.json();
      setQrCode(data.qrCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setQrLoading(false);
    }
  };

  /**
   * Envoi direct de l’itinéraire au mobile via l’API /navigation/push
   */
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

  /* --------------------------  Render  ---------------------------- */
  return (
    <div
      style={{
        marginBottom: "20px",
        padding: "15px",
        border: "1px solid #ddd",
        borderRadius: "4px",
      }}
    >
      <h2>Calculateur d’itinéraire</h2>

      {/* -------  Formulaire ------- */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleCalculateRoute();
        }}
      >
        {/* Source */}
        <div style={{ marginBottom: "10px" }}>
          <label style={{ marginRight: "10px" }}>Point de départ :</label>
          <input
            type="text"
            value={sourceInput}
            onChange={(e) => setSourceInput(e.target.value)}
            required
            placeholder="Ex : Paris ou 48.8566, 2.3522"
          />
        </div>

        {/* Destination */}
        <div style={{ marginBottom: "10px" }}>
          <label style={{ marginRight: "10px" }}>Destination :</label>
          <input
            type="text"
            value={destinationInput}
            onChange={(e) => setDestinationInput(e.target.value)}
            required
            placeholder="Ex : Lyon ou 45.7640, 4.8357"
          />
        </div>

        {/* Options */}
        <div style={{ marginBottom: "10px" }}>
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

      {error && <p style={{ color: "red" }}>Erreur : {error}</p>}

      {/* -------  Résultats ------- */}
      {routes && routes.length > 0 && (
        <div style={{ marginTop: "15px" }}>
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
                <strong>Distance :</strong> {rt.distance}
              </p>
              <p>
                <strong>Durée :</strong> {rt.duration}
              </p>
              <p>
                <strong>Type :</strong>{" "}
                {rt.recalculated ? "Recalculé" : "Optimal"}
              </p>
              <p>
                <strong>Instructions :</strong>
              </p>
              <ul>
                {rt.instructions.map((instr, i) => (
                  <li key={i}>{instr}</li>
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
          {pushMessage && <p style={{ color: "green" }}>{pushMessage}</p>}

          <button
            onClick={handleShare}
            disabled={qrLoading}
            style={{ marginTop: "10px", padding: "8px 12px" }}
          >
            {qrLoading ? "Génération du QR code…" : "Partager l’itinéraire"}
          </button>
        </div>
      )}

      {/* -------  QR code ------- */}
      {qrCode && (
        <div style={{ marginTop: "15px" }}>
          <h4>QR code de partage</h4>
          <img
            src={qrCode}
            alt="QR code itinéraire"
            style={{ maxWidth: "200px" }}
          />
        </div>
      )}
    </div>
  );
}

export default RouteCalculator;
