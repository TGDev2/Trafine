import React, { useState } from "react";
import RouteMap from "./RouteMap";

/**
 * @param {{socket?: import("socket.io-client").Socket}} props
 */
function RouteCalculator({ socket }) {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [routes, setRoutes] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);

  // Nettoyage des champs et résultats avant nouveau calcul
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRoutes(null);
    setQrCode(null);

    try {
      const response = await fetch(
        "http://localhost:3000/navigation/calculate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ source, destination, avoidTolls }),
        }
      );
      if (!response.ok) {
        throw new Error("Erreur lors du calcul de l'itinéraire");
      }
      const data = await response.json();
      const calculatedRoutes = data.routes || [];
      setRoutes(calculatedRoutes);

      if (socket && calculatedRoutes.length > 0) {
        const firstGeometry = calculatedRoutes[0].geometry;
        if (firstGeometry?.type === "LineString") {
          const feature = {
            type: "Feature",
            geometry: firstGeometry,
            properties: {},
          };
          socket.emit("subscribeRoute", { geometry: feature, threshold: 1000 });
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!source || !destination) {
      setError(
        "Veuillez spécifier la source et la destination avant de partager."
      );
      return;
    }
    setQrLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:3000/navigation/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source, destination, avoidTolls }),
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
        <div style={{ marginBottom: "10px" }}>
          <label style={{ marginRight: "10px" }}>Point de départ :</label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            required
            placeholder="Ex : 48.8566, 2.3522"
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ marginRight: "10px" }}>Destination :</label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
            placeholder="Ex : 45.7640, 4.8357"
          />
        </div>
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

      {/* Affichage des différentes routes retournées */}
      {routes && routes.length > 0 && (
        <div style={{ marginTop: "15px" }}>
          {/* Carte de l’itinéraire */}
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

      {/* Affichage du QR code si disponible */}
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
