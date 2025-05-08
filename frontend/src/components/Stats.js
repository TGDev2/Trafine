import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Cell,
} from "recharts";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../utils/api";
import { useNavigate } from "react-router-dom";
import "../style/stat.css";

export default function Stats() {
  const { token, refreshToken, refreshSession, logout } = useAuth();
  const [globalStats, setGlobalStats] = useState(null);
  const [hourlyStats, setHourlyStats] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      const fetchJson = (url) =>
        apiFetch(
          url,
          {},
          { token, refreshToken, refreshSession, logout }
        ).then((r) => r.json());

      const [gs, hs, pr] = await Promise.all([
        fetchJson("http://localhost:3000/statistics"),
        fetchJson("http://localhost:3000/statistics/hourly"),
        fetchJson("http://localhost:3000/statistics/prediction"),
      ]);
      setGlobalStats(gs);
      setHourlyStats(hs);
      setPrediction(pr);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line
  }, [token, refreshToken, refreshSession, logout]);

  if (error) {
    return (
      <div className="stats-container">
        <div className="stats-actions">
          <button className="modern-btn" onClick={fetchStats}>🔄 Rafraîchir</button>
          <button className="modern-btn logout" onClick={logout}>🚪 Déconnexion</button>
        </div>
        <p className="error-message">Erreur : {error}</p>
      </div>
    );
  }
  if (!globalStats) {
    return (
      <div className="stats-container">
        <div className="stats-actions">
          <button className="modern-btn" onClick={fetchStats}>🔄 Rafraîchir</button>
          <button className="modern-btn logout" onClick={logout}>🚪 Déconnexion</button>
        </div>
        <p>Chargement des statistiques…</p>
      </div>
    );
  }

  return (
    <div className="stats-container">
      <div className="stats-actions">
        <button className="modern-btn" onClick={fetchStats}>🔄 Rafraîchir</button>
        <button className="modern-btn logout" onClick={logout}>🚪 Déconnexion</button>
        <button className="modern-btn secondary" onClick={() => navigate("/")}>⬅️ Retour aux incidents</button>
      </div>
      <table className="stats-table">
        <thead>
          <tr>
            <th>Total incidents</th>
            <th>Confirmés</th>
            <th>Infirmés</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{globalStats.totalIncidents}</td>
            <td>{globalStats.confirmedIncidents}</td>
            <td>{globalStats.deniedIncidents}</td>
          </tr>
        </tbody>
      </table>

      <div className="stats-graphs-row">
        <div className="stats-graph">
          <h3>Répartition par type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={Object.entries(globalStats.incidentsByType).map(
                ([type, count]) => ({ type, count })
              )}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count">
                {
                  Object.entries(globalStats.incidentsByType).map(([type], idx) => {
                    const colors = [
                      "#3498db", // bleu
                      "#e67e22", // orange
                      "#e74c3c", // rouge
                      "#2ecc71", // vert
                      "#9b59b6", // violet
                      "#f1c40f", // jaune
                      "#16a085", // turquoise
                      "#34495e", // gris foncé
                    ];
                    return (
                      <Cell key={type} fill={colors[idx % colors.length]} />
                    );
                  })
                }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="stats-graph">
          <h3>Incidents par heure (24 h)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {prediction && (
        <div className="prediction">
          <strong>Niveau :</strong> {prediction.congestionLevel}
          <br />
          <strong>Incidents estimés :</strong> {prediction.incidentCount}
          <br />
          <em>(basé sur {prediction.daysAnalysed} jour(s) d’historique)</em>
        </div>
      )}
    </div>
  );
}