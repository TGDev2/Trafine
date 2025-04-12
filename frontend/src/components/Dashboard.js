import React, { useEffect, useState } from "react";
import MapView from "./MapView";
import RouteCalculator from "./RouteCalculator";
import { io } from "socket.io-client";

const Dashboard = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Récupération du token JWT stocké localement (après authentification)
  const token = localStorage.getItem("token");

  // Fonction de mise à jour des incidents lors de la réception d'une alerte
  const handleIncidentAlert = (incident) => {
    setIncidents((prevIncidents) => {
      const index = prevIncidents.findIndex((i) => i.id === incident.id);
      if (index === -1) {
        // Nouvel incident, on l'ajoute à la liste
        return [...prevIncidents, incident];
      } else {
        // Incident existant, on met à jour ses informations
        const updatedIncidents = [...prevIncidents];
        updatedIncidents[index] = incident;
        return updatedIncidents;
      }
    });
  };

  // Fonction pour confirmer un incident
  const handleConfirm = async (id) => {
    try {
      const response = await fetch(
        `http://localhost:3000/incidents/${id}/confirm`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (!response.ok) {
        throw new Error("Erreur lors de la confirmation de l'incident");
      }
      const updatedIncident = await response.json();
      // Mettre à jour la liste des incidents avec l'incident confirmé
      setIncidents((prevIncidents) =>
        prevIncidents.map((incident) =>
          incident.id === updatedIncident.id ? updatedIncident : incident
        )
      );
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // Fonction pour infirmer un incident
  const handleDeny = async (id) => {
    try {
      const response = await fetch(
        `http://localhost:3000/incidents/${id}/deny`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (!response.ok) {
        throw new Error("Erreur lors de l'infirmation de l'incident");
      }
      const updatedIncident = await response.json();
      // Mettre à jour la liste des incidents avec l'incident infirmé
      setIncidents((prevIncidents) =>
        prevIncidents.map((incident) =>
          incident.id === updatedIncident.id ? updatedIncident : incident
        )
      );
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  useEffect(() => {
    // Récupération initiale des incidents via REST
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

    // Établir la connexion WebSocket avec le backend
    const socket = io("http://localhost:3000", { transports: ["websocket"] });

    // Écouter les alertes d'incidents en temps réel
    socket.on("incidentAlert", (incident) => {
      console.log("Alerte reçue pour l'incident :", incident);
      handleIncidentAlert(incident);
    });

    // Nettoyage de la connexion lors du démontage du composant
    return () => {
      socket.disconnect();
    };
  }, []);

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div>
      <h2>Interface de Gestion Trafine</h2>
      <RouteCalculator />
      {error && <p style={{ color: "red" }}>Erreur : {error}</p>}
      <h2>Carte des Incidents</h2>
      <MapView incidents={incidents} />
      <h2>Liste des Incidents</h2>
      {incidents.length === 0 ? (
        <p>Aucun incident enregistré.</p>
      ) : (
        <ul>
          {incidents.map((incident) => (
            <li key={incident.id} style={{ marginBottom: "10px" }}>
              <strong>{incident.type}</strong> -{" "}
              {incident.description || "Sans description"} - Confirmé:{" "}
              {incident.confirmed ? "Oui" : "Non"}
              <div style={{ marginTop: "5px" }}>
                <button
                  onClick={() => handleConfirm(incident.id)}
                  style={{ marginRight: "5px" }}
                >
                  Confirmer
                </button>
                <button onClick={() => handleDeny(incident.id)}>
                  Infirmer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dashboard;
