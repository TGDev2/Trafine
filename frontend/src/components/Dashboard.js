import React, { useEffect, useState } from "react";
import MapView from "./MapView";
import RouteCalculator from "./RouteCalculator";
import { io } from "socket.io-client";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../utils/api";

const Dashboard = () => {
  const [incidents, setIncidents] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token, logout } = useAuth();

  // Handler pour la réception d'une alerte incident
  const handleIncomingIncident = (incident) => {
    console.log("Alerte reçue pour l'incident :", incident);
    setIncidents((prev) => {
      const idx = prev.findIndex((i) => i.id === incident.id);
      if (idx === -1) return [...prev, incident];
      const updated = [...prev];
      updated[idx] = incident;
      return updated;
    });
  };

  // Effet WebSocket : (re)connecte à chaque changement de token
  useEffect(() => {
    const socket = io("http://localhost:3000", {
      transports: ["websocket"],
      auth: { token: token ? `Bearer ${token}` : "" },
    });

    socket.on("incidentAlert", handleIncomingIncident);

    return () => {
      socket.off("incidentAlert", handleIncomingIncident);
      socket.disconnect();
    };
  }, [token]);

  // Effet REST initial : incidents + statistiques
  useEffect(() => {
    let isMounted = true;

    // Récupère tous les incidents
    apiFetch("http://localhost:3000/incidents", {}, { token, logout })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        setIncidents(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Erreur récupération incidents :", err);
        setError(err.message);
        setLoading(false);
      });

    // Récupère les statistiques si authentifié
    if (token) {
      apiFetch(
        "http://localhost:3000/statistics",
        { headers: { "Content-Type": "application/json" } },
        { token, logout }
      )
        .then((res) => res.json())
        .then((data) => {
          if (isMounted) setStatistics(data);
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error("Erreur récupération statistiques :", err);
          setError(err.message);
          setStatistics({
            totalIncidents: 0,
            confirmedIncidents: 0,
            deniedIncidents: 0,
            incidentsByType: {},
          });
        });
    } else if (isMounted) {
      setError("Utilisateur non authentifié.");
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [token, logout]);

  if (loading) {
    return <p>Chargement…</p>;
  }

  return (
    <div>
      <h2>Interface de Gestion Trafine</h2>
      {error && <p style={{ color: "red" }}>Erreur : {error}</p>}
      <RouteCalculator />
      {statistics && (
        <section>
          <h2>Statistiques de Trafic</h2>
          <p>
            <strong>Total incidents :</strong> {statistics.totalIncidents}
          </p>
          <p>
            <strong>Incidents confirmés :</strong>{" "}
            {statistics.confirmedIncidents}
          </p>
          <p>
            <strong>Incidents infirmés :</strong> {statistics.deniedIncidents}
          </p>
          <div>
            <h3>Répartition par type</h3>
            <ul>
              {Object.entries(statistics.incidentsByType).map(
                ([type, count]) => (
                  <li key={type}>
                    <strong>{type}</strong> : {count}
                  </li>
                )
              )}
            </ul>
          </div>
        </section>
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
              <strong>{incident.type}</strong> –{" "}
              {incident.description || "Sans description"} – Confirmé :{" "}
              {incident.confirmed ? "Oui" : "Non"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dashboard;
