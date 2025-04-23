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
} from "recharts";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../utils/api";

export default function Stats() {
  const { token, refreshToken, refreshSession, logout } = useAuth();
  const [globalStats, setGlobalStats] = useState(null);
  const [hourlyStats, setHourlyStats] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);

  /* ----------- Chargement initial ----------- */
  useEffect(() => {
    (async () => {
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
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [token, refreshToken, refreshSession, logout]);

  if (error) return <p style={{ color: "red" }}>Erreur : {error}</p>;
  if (!globalStats) return <p>Chargement des statistiques…</p>;

  /* ----------- Préparation des datasets ----------- */
  const incidentsByType = Object.entries(globalStats.incidentsByType).map(
    ([type, count]) => ({ type, count })
  );

  return (
    <div style={{ padding: 20 }}>
      <h2>Statistiques globales</h2>
      <ul>
        <li>Total incidents : {globalStats.totalIncidents}</li>
        <li>Confirmés : {globalStats.confirmedIncidents}</li>
        <li>Infirmés : {globalStats.deniedIncidents}</li>
      </ul>

      <h3>Répartition par type</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={incidentsByType}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="type" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" />
        </BarChart>
      </ResponsiveContainer>

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

      {prediction && (
        <>
          <h3>Prédiction prochaine heure</h3>
          <p>
            <strong>Niveau :</strong> {prediction.congestionLevel}
            <br />
            <strong>Incidents estimés :</strong> {prediction.incidentCount}
            <br />
            <em>(basé sur {prediction.daysAnalysed} jour(s) d’historique)</em>
          </p>
        </>
      )}
    </div>
  );
}
