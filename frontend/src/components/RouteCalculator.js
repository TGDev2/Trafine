import React, { useState } from "react";
import RouteMap from "./RouteMap";
import { geocode } from "../utils/geocode";

/**
 * @param {{socket?: import("socket.io-client").Socket}} props
 */
function RouteCalculator({ socket }) {
  // --- Saisie libre ----
  const [sourceInput, setSourceInput] = useState("");
  const [destinationInput, setDestinationInput] = useState("");

  // --- Coordonnées validées (lat, lon) ----
  const [sourceCoords, setSourceCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);

  const [avoidTolls, setAvoidTolls] = useState(false);
  const [routes, setRoutes] = useState(null);
  const [qrCode, setQrCode] = useState(null);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);

  /** --------------------------------------------------------
   *  Helpers
   * ------------------------------------------------------- */
  const coordRegex = /^-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+$/; // 48.85, 2.35

  const resolveCoord = async (value) =>
    coordRegex.test(value) ? value : await geocode(value);

  /** --------------------------------------------------------
   *  Calcul d’itinéraire
   * ------------------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRoutes(null);
    setQrCode(null);

    try {
      const src = await resolveCoord(sourceInput);
      const dst = await resolveCoord(destinationInput);

      // Persister les coordonnées pour un futur partage
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
      if (!response.ok) {
        throw new Error("Erreur lors du calcul de l'itinéraire");
      }
      const data = await response.json();
      const calculatedRoutes = data.routes || [];
      setRoutes(calculatedRoutes);

      /*  Abonnement aux alertes pour le premier itinéraire  */
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /** --------------------------------------------------------
   *  Partage d’itinéraire
   * ------------------------------------------------------- */
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
      if (!response.ok) {
        throw new Error("Erreur lors de la génération du QR code");
      }
      const data = await response.json();
      setQrCode(data.qrCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setQrLoading(false);
    }
  };

  /** --------------------------------------------------------
   *  Rendu
   * ------------------------------------------------------- */
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
      <form onSubmit={handleSubmit}>
        {/* Source */}
        <div style={{ marginBottom: "10px" }}>
          <label style={{ marginRight: "10px" }}>Point de départ :</label>
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
          <label style={{ marginRight: "10px" }}>Destination :</label>
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
          {loading ? "Calcul en cours..." : "Calculer"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>Erreur : {error}</p>}

      {/* Résultats */}
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
                <strong>Distance :</strong> {rt.distance}
              </p>
              <p>
                <strong>Durée :</strong> {rt.duration}
              </p>
              <p>
                <strong>Type d’itinéraire :</strong>{" "}
                {rt.recalculated
                  ? "Recalculé en raison d'incidents confirmés"
                  : "Optimal"}
              </p>
              <p>
                <strong>Instructions :</strong>
              </p>
              <ul>
                {rt.instructions.map((instr, i) => (
                  <li key={i}>{instr}</li>
                ))}
              </ul>
            </div>
          ))}

          <button
            onClick={handleShare}
            disabled={qrLoading}
            style={{ marginTop: "10px", padding: "8px 12px" }}
          >
            {qrLoading ? "Génération du QR code..." : "Partager l'itinéraire"}
          </button>
        </div>
      )}

      {/* QR‑code */}
      {qrCode && (
        <div style={{ marginTop: "15px" }}>
          <h4>QR Code pour partager l'itinéraire</h4>
          <img
            src={qrCode}
            alt="QR Code Itinéraire"
            style={{ maxWidth: "200px" }}
          />
        </div>
      )}
    </div>
  );
}

export default RouteCalculator;
