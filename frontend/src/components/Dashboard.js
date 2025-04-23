import React, { useEffect, useState, useRef } from "react";
import MapView from "./MapView";
import RouteCalculator from "./RouteCalculator";
import { io } from "socket.io-client";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../utils/api";

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
  const [voteLoadingId, setVoteLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const { token, refreshToken, logout, refreshSession, isAdmin, isModerator } =
    useAuth();
  const socketRef = useRef(null);

  /* ---------------- WebSocket ---------------- */
  const handleIncomingIncident = (incident) =>
    setIncidents((prev) => {
      const idx = prev.findIndex((i) => i.id === incident.id);
      return idx === -1
        ? [...prev, incident]
        : prev.map((i, j) => (j === idx ? incident : i));
    });

  useEffect(() => {
    const s = io("http://localhost:3000", {
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

  /* ---------------- Initial fetch inline ---------------- */
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    (async () => {
      try {
        const res = await apiFetch(
          "http://localhost:3000/incidents",
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

  /* ---------------- Vote helpers ---------------- */
  const voteIncident = async (id, action) => {
    setVoteLoadingId(id);
    try {
      const res = await apiFetch(
        `http://localhost:3000/incidents/${id}/${action}`,
        { method: "PATCH" },
        { token, refreshToken, refreshSession, logout }
      );
      const updated = await res.json();
      setIncidents((p) => p.map((i) => (i.id === id ? updated : i)));
    } catch (e) {
      setError(e.message);
    } finally {
      setVoteLoadingId(null);
    }
  };

  /* ---------------- CRUD helpers ---------------- */
  const handleCreateIncident = async () => {
    try {
      const res = await apiFetch(
        "http://localhost:3000/incidents",
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
      setIncidents((p) => [...p, created]);
      setForm(defaultForm);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleUpdateIncident = async (id) => {
    try {
      const res = await apiFetch(
        `http://localhost:3000/incidents/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editValues),
        },
        { token, refreshToken, refreshSession, logout }
      );
      const updated = await res.json();
      setIncidents((p) => p.map((i) => (i.id === id ? updated : i)));
      setEditingId(null);
      setEditValues({});
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDeleteIncident = async (id) => {
    if (!window.confirm("Supprimer définitivement cet incident ?")) return;
    try {
      await apiFetch(
        `http://localhost:3000/incidents/${id}`,
        { method: "DELETE" },
        { token, refreshToken, refreshSession, logout }
      );
      setIncidents((p) => p.filter((i) => i.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <p>Chargement…</p>;

  return (
    <div style={{ padding: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Interface de Gestion Trafine</h1>
        {token && (
          <button onClick={logout} style={{ height: 30 }}>
            Déconnexion
          </button>
        )}
      </header>

      {(isModerator || isAdmin) && (
        <section style={{ margin: "20px 0" }}>
          <h2>Créer un incident</h2>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {INCIDENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <input
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              style={{ flex: 1 }}
            />
            <input
              placeholder="Latitude"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              style={{ width: 110 }}
            />
            <input
              placeholder="Longitude"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              style={{ width: 110 }}
            />
            <button onClick={handleCreateIncident}>Créer</button>
          </div>
        </section>
      )}

      <MapView incidents={incidents} />

      <h2>Incidents</h2>
      {incidents.length === 0 ? (
        <p>Aucun incident.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {incidents.map((inc) => (
            <li
              key={inc.id}
              style={{
                marginBottom: 10,
                border: "1px solid #ddd",
                padding: 10,
                borderRadius: 4,
              }}
            >
              {editingId === inc.id ? (
                <>
                  <input
                    value={editValues.type ?? inc.type}
                    onChange={(e) =>
                      setEditValues({ ...editValues, type: e.target.value })
                    }
                    style={{ marginBottom: 6 }}
                  />
                  <input
                    value={editValues.description ?? inc.description}
                    onChange={(e) =>
                      setEditValues({
                        ...editValues,
                        description: e.target.value,
                      })
                    }
                    style={{ marginBottom: 6, width: "60%" }}
                  />
                  <button onClick={() => handleUpdateIncident(inc.id)}>
                    Enregistrer
                  </button>
                  <button onClick={() => setEditingId(null)}>Annuler</button>
                </>
              ) : (
                <>
                  <p style={{ margin: 0 }}>
                    <strong>{inc.type}</strong> —{" "}
                    {inc.description || "Sans description"}
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    Confirmé : {inc.confirmed ? "Oui" : "Non"} | Infirmé :{" "}
                    {inc.denied ? "Oui" : "Non"}
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => voteIncident(inc.id, "confirm")}
                      disabled={voteLoadingId === inc.id || inc.confirmed}
                    >
                      Confirmer
                    </button>
                    <button
                      onClick={() => voteIncident(inc.id, "deny")}
                      disabled={voteLoadingId === inc.id || inc.denied}
                    >
                      Infirmer
                    </button>
                    {(isModerator || isAdmin) && (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(inc.id);
                            setEditValues({
                              type: inc.type,
                              description: inc.description,
                            });
                          }}
                        >
                          Modifier
                        </button>
                        {isAdmin && (
                          <button
                            style={{ color: "red" }}
                            onClick={() => handleDeleteIncident(inc.id)}
                          >
                            Supprimer
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <RouteCalculator socket={socketRef.current} />
    </div>
  );
}
