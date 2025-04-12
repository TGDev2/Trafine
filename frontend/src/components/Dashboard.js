import React, { useEffect, useState } from "react";
import MapView from "./MapView";
import RouteCalculator from "./RouteCalculator";

const Dashboard = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:3000/incidents")
      .then((response) => response.json())
      .then((data) => {
        setIncidents(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Erreur lors de la récupération des incidents :", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div>
      <h2>Interface de Gestion Trafine</h2>
      <RouteCalculator />
      <h2>Carte des Incidents</h2>
      <MapView incidents={incidents} />
      <h2>Liste des Incidents</h2>
      {incidents.length === 0 ? (
        <p>Aucun incident enregistré.</p>
      ) : (
        <ul>
          {incidents.map((incident) => (
            <li key={incident.id}>
              <strong>{incident.type}</strong> -{" "}
              {incident.description || "Sans description"} - Confirmé:{" "}
              {incident.confirmed ? "Oui" : "Non"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dashboard;
