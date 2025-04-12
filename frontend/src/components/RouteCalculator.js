import React, { useState } from "react";

const RouteCalculator = () => {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [route, setRoute] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
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
      setRoute(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
            placeholder="Ex : Paris"
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ marginRight: "10px" }}>Destination :</label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
            placeholder="Ex : Lyon"
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
      {route && (
        <div style={{ marginTop: "15px" }}>
          <h3>Itinéraire calculé</h3>
          <p>
            <strong>Distance :</strong> {route.distance}
          </p>
          <p>
            <strong>Durée :</strong> {route.duration}
          </p>
          <p>
            <strong>Type d’itinéraire :</strong>{" "}
            {route.recalculated
              ? "Recalculé en raison d'incidents confirmés"
              : "Optimal"}
          </p>
          <h4>Instructions :</h4>
          <ul>
            {route.instructions.map((instr, index) => (
              <li key={index}>{instr}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RouteCalculator;
