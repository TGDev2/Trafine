/**
 * Dashboard Component
 *
 * Ce composant gère l'affichage du dashboard pour l'interface web Trafine.
 * Il établit une connexion sécurisée à l'API via WebSocket en transmettant le token JWT,
 * écoute les alertes d'incidents en temps réel et met à jour l'interface en conséquence.
 */

import React, { useEffect, useState } from "react";
import MapView from "./MapView";
import RouteCalculator from "./RouteCalculator";
import { io } from "socket.io-client";

const Dashboard = () => {
  const [incidents, setIncidents] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Établissement de la connexion WebSocket sécurisée
  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = io("http://localhost:3000", {
      transports: ["websocket"],
      auth: { token: `Bearer ${token}` },
    });

    socket.on("incidentAlert", (incident) => {
      console.log("Alerte reçue pour l'incident :", incident);
      setIncidents((prevIncidents) => {
        const index = prevIncidents.findIndex((i) => i.id === incident.id);
        if (index === -1) {
          // Nouvel incident, on l'ajoute à la liste
          return [...prevIncidents, incident];
        } else {
          // Incident existant, mise à jour des informations
          const updatedIncidents = [...prevIncidents];
          updatedIncidents[index] = incident;
          return updatedIncidents;
        }
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Récupération initiale des incidents et des statistiques via REST
  useEffect(() => {
    // Récupération des incidents
    fetch("http://localhost:3000/incidents")
      .then((response) => response.json())
      .then((data) => {
        setIncidents(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erreur lors de la récupération des incidents :", err);
        setError("Erreur lors de la récupération des incidents.");
        setLoading(false);
      });

    // Récupération des statistiques
    const token = localStorage.getItem("token");
    if (token) {
      fetch("http://localhost:3000/statistics", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Erreur ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then((data) => setStatistics(data))
        .catch((err) => {
          console.error(
            "Erreur lors de la récupération des statistiques:",
            err
          );
          setError("Erreur lors de la récupération des statistiques.");
          setStatistics({
            totalIncidents: 0,
            confirmedIncidents: 0,
            deniedIncidents: 0,
            incidentsByType: {},
          });
        });
    }
  }, []);

  // Affichage d'un indicateur de chargement si la récupération des données est en cours
  if (loading) {
    return <p>Chargement...</p>;
  }

  return (
    <div>
      <h2>Interface de Gestion Trafine</h2>
      {error && <p style={{ color: "red" }}>Erreur : {error}</p>}
      <RouteCalculator />
      {statistics && (
        <div>
          <h2>Statistiques de Trafic</h2>
          <p>
            <strong>Total incidents :</strong> {statistics.totalIncidents}
          </p>
          <p>
            <strong>Incidents confirmés :</strong>{" "}
            {statistics.confirmedIncidents}
          </p>
          <p>
            <strong>Incidents infirmés :</strong> {statistics.deniedIncidents}
          </p>
          <div>
            <h3>Répartition par type</h3>
            <ul>
              {Object.entries(statistics.incidentsByType || {}).map(
                ([type, count]) => (
                  <li key={type}>
                    <strong>{type}</strong> : {count}
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      )}
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dashboard;
