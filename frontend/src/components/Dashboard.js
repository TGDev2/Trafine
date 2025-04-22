import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MapView from "./MapView";
import RouteCalculator from "./RouteCalculator";
import { io } from "socket.io-client";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../utils/api";

const Dashboard = () => {
  const [incidents, setIncidents] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [hourlyStats, setHourlyStats] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voteLoadingId, setVoteLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { token, refreshToken, logout, refreshSession } = useAuth();
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
          { token, refreshToken, refreshSession, logout }
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
        const statsRes = await apiFetch(
          "http://localhost:3000/statistics",
          {},
          { token, refreshToken, refreshSession, logout }
        );
        const hourlyRes = await apiFetch(
          "http://localhost:3000/statistics/hourly",
          {},
          { token, refreshToken, refreshSession, logout }
        );
        if (!isMounted) return;
        setStatistics(await statsRes.json());
        setHourlyStats(await hourlyRes.json());
      } catch (e) {
        if (isMounted) setError(e.message);
      }
    };

    const fetchPrediction = async () => {
      if (!token) return;
      try {
        const predRes = await apiFetch(
          "http://localhost:3000/statistics/prediction",
          {},
          { token, refreshToken, refreshSession, logout }
        );
        if (!isMounted) return;
        setPrediction(await predRes.json());
      } catch (e) {
        if (isMounted) setError(e.message);
      }
    };

    fetchIncidents();
    fetchStats();
    fetchPrediction();

    return () => {
      isMounted = false;
    };
  }, [token, refreshToken, refreshSession, logout]);

  /** -------------------- Vote helpers -------------------- */
  const voteIncident = async (id, action) => {
    setVoteLoadingId(id);
    try {
      const res = await apiFetch(
        `http://localhost:3000/incidents/${id}/${action}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" } },
        { token, refreshToken, refreshSession, logout }
      );
      const updated = await res.json();
      setIncidents((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (e) {
      setError(e.message);
    } finally {
      setVoteLoadingId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  if (loading) return <p>Chargement…</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button onClick={handleLogout}>Se déconnecter</button>
      </div>
      <h2>Interface de Gestion Trafine</h2>
      {error && <p style={{ color: "red" }}>Erreur : {error}</p>}

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

      {prediction && (
        <section>
          <h2>Prévision de la Congestion</h2>
          <p>
            <strong>Niveau :</strong>{" "}
            {prediction.congestionLevel.charAt(0).toUpperCase() +
              prediction.congestionLevel.slice(1)}
          </p>
          <p>
            <strong>Incidents récents (60 min) :</strong>{" "}
            {prediction.incidentCount}
          </p>
        </section>
      )}

      {hourlyStats && (
        <section>
          <h3>Incidents par heure (24 h)</h3>
          <ul>
            {hourlyStats.map(({ hour, count }) => (
              <li key={hour}>
                <strong>{hour}</strong> : {count}
              </li>
            ))}
          </ul>
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
