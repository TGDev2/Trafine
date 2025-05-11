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
import { useNavigate, Link } from "react-router-dom";
// Suppression de l'import dupliqué de Link
import "../style/stat.css";

export default function Stats() {
  const { token, refreshToken, refreshSession, logout, isAdmin } = useAuth();
  const ctx = { token, refreshToken, refreshSession, logout };
  const [globalStats, setGlobalStats] = useState(null);
  const [hourlyStats, setHourlyStats] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      const fetchJson = (url) => apiFetch(url, {}, ctx).then((r) => r.json());

      const [gs, hs, pr] = await Promise.all([
        fetchJson("/statistics"),
        fetchJson("/statistics/hourly"),
        fetchJson("/statistics/prediction"),
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
      <div className="stats-layout">
        <div className="stats-header">
          <h1>Trafine – Interface web</h1>
          <nav>
            <Link to="/" className="header-link">
              Incidents
            </Link>
            <Link to="/stats" className="header-link">
              Statistiques
            </Link>
            <Link to="/itineraire" className="header-link">
              Itinéraire
            </Link>
          </nav>
        </div>
        <div className="stats-sidebar">
          <ul className="menu">
            <li>
              <button onClick={() => setShowIncidentForm(!showIncidentForm)}>
                Ajouter Incident
              </button>
            </li>
            {isAdmin && (
              <li>
                <Link to="/users" className="menu-btn">
                  Utilisateurs
                </Link>
              </li>
            )}
            <li>
              <button onClick={logout}>Déconnexion</button>
            </li>
          </ul>
          {/* Formulaire d'ajout d'incident si nécessaire */}
        </div>
        <div className="stats-main">
          <div className="stats-container">
            <p className="error-message">Erreur : {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!globalStats) {
    return (
      <div className="stats-layout">
        <div className="stats-header">
          <h1>Trafine – Interface web</h1>
          <nav>
            <Link to="/" className="header-link">
              Incidents
            </Link>
            <Link to="/stats" className="header-link">
              Statistiques
            </Link>
            <Link to="/itineraire" className="header-link">
              Itinéraire
            </Link>
          </nav>
        </div>
        <div className="stats-sidebar">
          <ul className="menu">
            <li>
              <button onClick={() => setShowIncidentForm(!showIncidentForm)}>
                Ajouter Incident
              </button>
            </li>
            {isAdmin && (
              <li>
                <Link to="/users" className="menu-btn">
                  Utilisateurs
                </Link>
              </li>
            )}
            <li>
              <button onClick={logout}>Déconnexion</button>
            </li>
          </ul>
          {/* Formulaire d'ajout d'incident si nécessaire */}
        </div>
        <div className="stats-main">
          <div className="stats-container">
            <p>Chargement des statistiques…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-layout">
      <div className="dashboard-header">
        {/* Logo Traffine */}
        <img src="/traffine-icon-noBG.png" alt="Traffine Logo" className="logo" />
        <h1>Trafine – Interface web</h1>
        <nav>
          <Link to="/" className="header-link">
            Incidents
          </Link>
          <Link to="/stats" className="header-link">
            Statistiques
          </Link>
          <Link to="/itineraire" className="header-link">
            Itinéraire
          </Link>
        </nav>
      </div>

      {/* Reste du contenu de votre page */}
      <div className="stats-sidebar">
        <ul className="menu">
          <li>
            <button onClick={() => setShowIncidentForm(!showIncidentForm)}>
              Ajouter Incident
            </button>
          </li>
          {isAdmin && (
            <li>
              <Link to="/users" className="menu-btn">
                Utilisateurs
              </Link>
            </li>
          )}
          <li>
            <button onClick={logout}>Déconnexion</button>
          </li>
        </ul>
        {/* Formulaire d'ajout d'incident si nécessaire */}
      </div>
      <div className="stats-main">
        <div className="stats-container">
          <div className="stats-actions">
            <button className="modern-btn" onClick={fetchStats}>🔄 Rafraîchir</button>
            {isAdmin && (
              <button
                className="modern-btn reset-btn"
                onClick={async () => {
                  if (window.confirm('Êtes-vous sûr de vouloir supprimer tous les incidents ? Cette action est irréversible.')) {
                    try {
                      await apiFetch(
                        "/incidents",
                        {
                          method: "DELETE",
                          headers: {
                            "Content-Type": "application/json"
                          }
                        },
                        ctx
                      );
                      // Rafraîchir les statistiques après la suppression
                      fetchStats();
                      alert("Tous les incidents ont été supprimés avec succès.");
                    } catch (error) {
                      alert("Erreur lors de la suppression des incidents : " + error.message);
                    }
                  }
                }}
              >
                🗑️ Réinitialiser les incidents
              </button>
            )}
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
              <em>(basé sur {prediction.daysAnalysed} jour(s) d'historique)</em>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}