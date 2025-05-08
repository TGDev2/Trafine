import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { apiFetch } from "../utils/api";

// Correction des icônes par défaut de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const INCIDENT_TYPES = [
  "accident",
  "embouteillage",
  "route fermée",
  "contrôle policier",
  "obstacle",
];

const MapView = ({
  incidents: initialIncidents,
  isAdmin = false,
  isModerator = false,
  token,
  refreshToken,
  refreshSession,
  logout,
}) => {
  const [incidents, setIncidents] = useState(initialIncidents || []);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [voteLoadingId, setVoteLoadingId] = useState(null);
  const [error, setError] = useState(null);

  const defaultPosition = [46.603354, 1.8883335];

  const voteIncident = async (id, action) => {
    setVoteLoadingId(id);
    try {
      const res = await apiFetch(
        `http://localhost:3000/incidents/${id}/${action}`,
        { 
          method: "PATCH",
          headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        },
        { token, refreshToken, refreshSession, logout }
      );
      if (res.status === 401) {
        logout();
        return;
      }
      const updated = await res.json();
      setIncidents((p) => p.map((i) => (i.id === id ? updated : i)));
    } catch (e) {
      if (e.message && e.message.toLowerCase().includes("session")) {
        logout();
      } else {
        setError(e.message);
      }
    } finally {
      setVoteLoadingId(null);
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
      if (res.status === 401) {
        logout();
        return;
      }
      const updated = await res.json();
      setIncidents((p) => p.map((i) => (i.id === id ? updated : i)));
      setEditingId(null);
      setEditValues({});
    } catch (e) {
      if (e.message && e.message.toLowerCase().includes("session")) {
        logout();
      } else {
        setError(e.message);
      }
    }
  };

  const handleDeleteIncident = async (id) => {
    if (!window.confirm("Supprimer définitivement cet incident ?")) return;
    try {
      const res = await apiFetch(
        `http://localhost:3000/incidents/${id}`,
        { method: "DELETE" },
        { token, refreshToken, refreshSession, logout }
      );
      if (res.status === 401) {
        logout();
        return;
      }
      setIncidents((p) => p.filter((i) => i.id !== id));
    } catch (e) {
      if (e.message && e.message.toLowerCase().includes("session")) {
        logout();
      } else {
        setError(e.message);
      }
    }
  };

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <MapContainer
        center={defaultPosition}
        zoom={6}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {incidents &&
          incidents.map((inc) =>
            inc.latitude && inc.longitude ? (
              <Marker
                key={inc.id}
                position={[inc.latitude, inc.longitude]}
              >
                <Popup minWidth={250}>
                  {editingId === inc.id ? (
                    <>
                      <select
                        value={editValues.type ?? inc.type}
                        onChange={(e) =>
                          setEditValues({ ...editValues, type: e.target.value })
                        }
                        style={{ marginBottom: 6 }}
                      >
                        {INCIDENT_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <input
                        value={editValues.description ?? inc.description}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            description: e.target.value,
                          })
                        }
                        style={{ marginBottom: 6, width: "90%" }}
                      />
                      <button onClick={() => handleUpdateIncident(inc.id)}>
                        Enregistrer
                      </button>
                      <button onClick={() => setEditingId(null)}>
                        Annuler
                      </button>
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
                  {error && (
                    <p style={{ color: "red", fontSize: 12 }}>{error}</p>
                  )}
                </Popup>
              </Marker>
            ) : null
          )}
      </MapContainer>
    </div>
  );
};

export default MapView;