import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import RouteMap from "./RouteMap";
import { geocode } from "../utils/geocode";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../utils/api";
// Suppression de l'import dupliqué de Link
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
    .replace(" 1st", " première")
    .replace(" 2nd", " deuxième")
    .replace(" 3rd", " troisième")
    .replace(" 4th", " quatrième")
    .replace(" 5th", " cinquième")
    .replace(" 6th", " sixième")
    .replace("on the left", "sur la gauche")
    .replace("on the right", "sur la droite")
    .replace("at the end of", "à la fin de")
    .replace("at the end", "à la fin")
    .replace("enter", "entrer")
    .replace("straight", "tout droit")
    .replace("your", "votre")
    .replace("and", "et")
}

// Fonction pour formater la durée en français
function formatDuration(duration) {
  // Vérifier si duration est un nombre valide ou une chaîne qui peut être convertie en nombre
  if (duration === null || duration === undefined) {
    return "Durée inconnue";
  }

  // Convertir en nombre si c'est une chaîne
  const durationNum = parseFloat(duration);

  // Vérifier si la conversion a réussi
  if (isNaN(durationNum)) {
    return "Durée inconnue";
  }

  const minutes = Math.floor(durationNum % 60);
  const hours = Math.floor((durationNum / 60) % 24);
  const days = Math.floor(durationNum / (60 * 24));

  const parts = [];

  if (days > 0) {
    parts.push(`${days} jour${days > 1 ? "s" : ""}`);
  }
  if (hours > 0) {
    parts.push(`${hours} heure${hours > 1 ? "s" : ""}`);
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
  }

  return parts.join(" et ");
}

function RouteCalculator({ socket }) {
  // ---------------------------  State  ---------------------------
  const [sourceInput, setSourceInput] = useState(() => localStorage.getItem('sourceInput') || "");
  const [destinationInput, setDestinationInput] = useState(() => localStorage.getItem('destinationInput') || "");
  const [sourceCoords, setSourceCoords] = useState(() => {
    const saved = localStorage.getItem('sourceCoords');
    return saved ? JSON.parse(saved) : null;
  });
  const [destCoords, setDestCoords] = useState(() => {
    const saved = localStorage.getItem('destCoords');
    return saved ? JSON.parse(saved) : null;
  });
  const [avoidTolls, setAvoidTolls] = useState(() => {
    const saved = localStorage.getItem('avoidTolls');
    return saved ? JSON.parse(saved) : false;
  });
  const [routes, setRoutes] = useState(() => {
    const saved = localStorage.getItem('routes');
    return saved ? JSON.parse(saved) : null;
  });

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

  // Sauvegarde des états dans localStorage quand ils changent
  useEffect(() => {
    localStorage.setItem('sourceInput', sourceInput);
  }, [sourceInput]);

  useEffect(() => {
    localStorage.setItem('destinationInput', destinationInput);
  }, [destinationInput]);

  useEffect(() => {
    if (sourceCoords) {
      localStorage.setItem('sourceCoords', JSON.stringify(sourceCoords));
    }
  }, [sourceCoords]);

  useEffect(() => {
    if (destCoords) {
      localStorage.setItem('destCoords', JSON.stringify(destCoords));
    }
  }, [destCoords]);

  useEffect(() => {
    localStorage.setItem('avoidTolls', JSON.stringify(avoidTolls));
  }, [avoidTolls]);

  useEffect(() => {
    if (routes) {
      localStorage.setItem('routes', JSON.stringify(routes));
    }
  }, [routes]);

  // ---------------------------------------------------------------
  //  Calcul d'itinéraire (extrait dans une callback réutilisable)
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
        // 1/ Résolution des coordonnées
        const src = coordRegex.test(sourceInput)
          ? sourceInput
          : await geocode(sourceInput);
        const dst = coordRegex.test(destinationInput)
          ? destinationInput
          : await geocode(destinationInput);

        setSourceCoords(src);
        setDestCoords(dst);

        // 2/ Appel backend sécurisé (CSRF + JWT auto)
        const response = await apiFetch(
          "http://localhost:3000/navigation/calculate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source: src, destination: dst, avoidTolls }),
          },
          { token, refreshToken, refreshSession, logout } // ← contexte auth
        );

        if (!response.ok) {
          const text = await response.text();
          throw new Error(
            `Erreur lors du calcul d'itinéraire (${response.status}) : ${text}`
          );
        }

        const data = await response.json();
        const calculatedRoutes = data.routes || [];
        setRoutes(calculatedRoutes);

        // 3/ Abonnement WebSocket pour la 1ʳᵉ route (inchangé)
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
    [
      sourceInput,
      destinationInput,
      avoidTolls,
      socket,
      token,
      refreshToken,
      refreshSession,
      logout,
    ]
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
      setError("Vous devez d'abord calculer un itinéraire valide.");
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

  // Envoi direct de l'itinéraire au mobile via l'API /navigation/push
  const handlePush = async () => {
    if (!sourceCoords || !destCoords) {
      setError("Vous devez d'abord calculer un itinéraire valide.");
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

  // --------------------------  Reset  --------------------------
  const handleReset = () => {
    // Clear all form inputs and results
    setSourceInput("");
    setDestinationInput("");
    setSourceCoords(null);
    setDestCoords(null);
    setRoutes(null);
    
    // Clear localStorage
    localStorage.removeItem('sourceInput');
    localStorage.removeItem('destinationInput');
    localStorage.removeItem('sourceCoords');
    localStorage.removeItem('destCoords');
    localStorage.removeItem('routes');
    
    // Reset QR code state
    setQrCode(null);
    setShareId(null);
    setPushMessage(null);
    setError(null);
  };

  // --------------------------  Render  ----------------------------
  return (
    <div className="route-calc-layout">
      <div className="dashboard-header">
        {/* Logo Traffine */}
        <img src="/traffine-icon-noBG.png" alt="Traffine Logo" className="logo" />
        <h1>Trafine – Interface web</h1>
        <nav>
          <Link to="/" className="header-link">
            Incidents
          </Link>
          <Link to="/stats" className="header-link">
            Statistiques
          </Link>
          <Link to="/itineraire" className="header-link">
            Itinéraire
          </Link>
        </nav>
      </div>
      <div className="route-calc-container">
        <h2>Calculateur d'itinéraire</h2>

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
                className="route-card"
                style={{
                  marginBottom: "20px",
                  background: "white",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.1)"
                }}
              >
                <div className="route-header" style={{ 
                  display: "flex", 
                  justifyContent: "space-between",
                  marginBottom: "15px",
                  padding: "0 0 15px 0",
                  borderBottom: "1px solid #eee"
                }}>
                  <div>
                    <h4 style={{ margin: "0 0 5px 0", color: "#2c3e50" }}>
                      {idx === 0 ? "Itinéraire recommandé" : `Alternative ${idx + 1}`}
                    </h4>
                    <span style={{ color: "#7f8c8d" }}>
                      {rt.distance} • {(() => {
                        console.log("Type de durée:", typeof rt.duration, "Valeur:", rt.duration);
                        return formatDuration(rt.duration);
                      })()}
                    </span>
                  </div>
                  <div style={{ 
                    padding: "4px 12px",
                    borderRadius: "15px",
                    background: rt.recalculated ? "#fff3cd" : "#d4edda",
                    color: rt.recalculated ? "#856404" : "#155724",
                    fontSize: "0.9em"
                  }}>
                    {rt.recalculated ? "Recalculé" : "Optimal"}
                  </div>
                </div>
                
                <div className="route-instructions">
                  {rt.instructions.map((instr, i) => (
                    <div key={i} style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "12px 0",
                      borderBottom: i < rt.instructions.length - 1 ? "1px solid #f5f6fa" : "none"
                    }}>
                      <div style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: "#f1f2f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: "15px",
                        flexShrink: 0
                      }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        {translateInstruction(instr)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={handlePush}
              disabled={pushLoading}
              style={{ marginTop: "10px", padding: "8px 12px" }}
            >
              {pushLoading ? "Envoi en cours…" : "Envoyer sur mobile"}
            </button>
            {pushMessage && <p className="success-msg">{pushMessage}</p>}

            <button
              onClick={handleShare}
              disabled={qrLoading}
              style={{ marginTop: "10px", padding: "8px 12px" }}
            >
              {qrLoading ? "Génération du QR code…" : "Partager l'itinéraire"}
            </button>
            
            <button
              onClick={handleReset}
              style={{ marginTop: "10px", padding: "8px 12px", marginLeft: "10px" }}
            >
              Réinitialiser
            </button>

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
        )}
      </div>
    </div>
  );
}

export default RouteCalculator;

