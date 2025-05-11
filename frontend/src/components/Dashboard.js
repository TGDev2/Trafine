import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import MapView from "./MapView";
import { io } from "socket.io-client";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE, apiFetch } from "../utils/api";
import "../style/Dashboard.css";
import "../style/Users.css";

const defaultForm = {
  type: "accident",
  description: "",
  latitude: "",
  longitude: "",
};
const INCIDENT_TYPES = [
  "accident",
  "embouteillage",
  "route fermée",
  "contrôle policier",
  "obstacle",
];

export default function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [showIncidentForm, setShowIncidentForm] = useState(false);

  const { token, refreshToken, logout, refreshSession, isAdmin, isModerator } =
    useAuth();
  const socketRef = useRef(null);

  const handleIncomingIncident = (incident) =>
    setIncidents((prev) => {
      const idx = prev.findIndex((i) => i.id === incident.id);
      return idx === -1
        ? [...prev, incident]
        : prev.map((i, j) => (j === idx ? incident : i));
    });

  useEffect(() => {
    const s = io(API_BASE, {
      transports: ["websocket"],
      auth: { token: token ? `Bearer ${token}` : "" },
    });
    socketRef.current = s;
    s.on("incidentAlert", handleIncomingIncident);
    return () => {
      s.off("incidentAlert", handleIncomingIncident);
      s.disconnect();
    };
  }, [token]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    (async () => {
      try {
        const res = await apiFetch(
          "/incidents",
          {},
          { token, refreshToken, refreshSession, logout }
        );
        if (isMounted) setIncidents(await res.json());
      } catch (e) {
        if (isMounted) setError(e.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [token, refreshToken, refreshSession, logout]);

  const handleCreateIncident = async () => {
    try {
      const res = await apiFetch(
        "/incidents",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            latitude: parseFloat(form.latitude),
            longitude: parseFloat(form.longitude),
          }),
        },
        { token, refreshToken, refreshSession, logout }
      );
      const created = await res.json();
      setIncidents((prev) => [...prev, created]);
      setForm(defaultForm);
      setShowIncidentForm(false);
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <p className="loading">Chargement…</p>;

  return (
    <div className="dashboard-layout">
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
      <div className="dashboard-sidebar">
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
        {showIncidentForm && (isModerator || isAdmin) && (
          <div className="incident-form">
            <h2>Créer un incident</h2>
            {error && <p className="error-msg">{error}</p>}
            <div className="form-inputs">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {INCIDENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Latitude"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              />
              <input
                type="text"
                placeholder="Longitude"
                value={form.longitude}
                onChange={(e) =>
                  setForm({ ...form, longitude: e.target.value })
                }
              />
              <button onClick={handleCreateIncident} className="create-btn">
                Créer
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="dashboard-main">
        <MapView
          incidents={incidents}
          isAdmin={isAdmin}
          isModerator={isModerator}
          token={token}
          refreshToken={refreshToken}
          refreshSession={refreshSession}
          logout={logout}
        />
      </div>
    </div>
  );
}
