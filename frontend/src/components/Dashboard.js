import React, { useEffect, useState, useRef } from "react";
import MapView from "./MapView";
import RouteCalculator from "./RouteCalculator";
import { io } from "socket.io-client";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../utils/api";

const Dashboard = () => {
  const [incidents, setIncidents] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voteLoadingId, setVoteLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const { token, logout } = useAuth();
  const socketRef = useRef(null);

  /** -------------------- WebSocket -------------------- */
  const handleIncomingIncident = (incident) => {
    setIncidents((prev) => {
      const idx = prev.findIndex((i) => i.id === incident.id);
      if (idx === -1) return [...prev, incident];
      const updated = [...prev];
      updated[idx] = incident;
      return updated;
    });
  };

  useEffect(() => {
    const socket = io("http://localhost:3000", {
      transports: ["websocket"],
      auth: { token: token ? `Bearer ${token}` : "" },
    });
    socketRef.current = socket;
    socket.on("incidentAlert", handleIncomingIncident);
    return () => {
      socket.off("incidentAlert", handleIncomingIncident);
      socket.disconnect();
    };
  }, [token]);

  /** -------------------- Initial fetch -------------------- */
  useEffect(() => {
    let isMounted = true;

    const fetchIncidents = async () => {
      try {
        const res = await apiFetch(
          "http://localhost:3000/incidents",
          {},
          { token, logout }
        );
        if (!isMounted) return;
        setIncidents(await res.json());
      } catch (e) {
        if (isMounted) setError(e.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const fetchStats = async () => {
      if (!token) return;
      try {
        const res = await apiFetch(
          "http://localhost:3000/statistics",
          {},
          { token, logout }
        );
        if (isMounted) setStatistics(await res.json());
      } catch (e) {
        if (isMounted) setError(e.message);
      }
    };

    fetchIncidents();
    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [token, logout]);

  /** -------------------- Vote helpers -------------------- */
  const voteIncident = async (id, action) => {
    setVoteLoadingId(id);
    try {
      const res = await apiFetch(
        `http://localhost:3000/incidents/${id}/${action}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" } },
        { token, logout }
      );
      const updated = await res.json();
      setIncidents((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (e) {
      setError(e.message);
    } finally {
      setVoteLoadingId(null);
    }
  };

  if (loading) return <p>Chargement…</p>;

  return (
    <div>
      <h2>Interface de Gestion Trafine</h2>
      {error && <p style={{ color: "red" }}>Erreur : {error}</p>}

      <RouteCalculator />
      <RouteCalculator socket={socketRef.current} />

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
        <ul style={{ listStyle: "none", padding: 0 }}>
          {incidents.map((incident) => (
            <li
              key={incident.id}
              style={{
                marginBottom: 10,
                border: "1px solid #ddd",
                padding: 10,
                borderRadius: 4,
              }}
            >
              <p style={{ margin: 0 }}>
                <strong>{incident.type}</strong> —{" "}
                {incident.description || "Sans description"}
              </p>
              <p style={{ margin: "4px 0" }}>
                Confirmé : {incident.confirmed ? "Oui" : "Non"} | Infirmé :{" "}
                {incident.denied ? "Oui" : "Non"}
              </p>

              {token && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => voteIncident(incident.id, "confirm")}
                    disabled={
                      voteLoadingId === incident.id || incident.confirmed
                    }
                  >
                    {voteLoadingId === incident.id && "…"} Confirmer
                  </button>
                  <button
                    onClick={() => voteIncident(incident.id, "deny")}
                    disabled={voteLoadingId === incident.id || incident.denied}
                  >
                    {voteLoadingId === incident.id && "…"} Infirmer
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dashboard;
