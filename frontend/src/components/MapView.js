import React, { useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
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

// Définition des icônes personnalisées pour chaque type d'incident
const getCustomIcon = (type) => {
  let iconUrl;
  
  switch(type) {
    case 'accident':
      iconUrl = '/accident.png';
      break;
    case 'embouteillage':
      iconUrl = '/embouteillage.png';
      break;
    case 'obstacle':
      iconUrl = '/obstacle.png';
      break;
    case 'contrôle policier':
      iconUrl = '/police.png';
      break;
    case 'route fermée':
      iconUrl = '/route.png';
      break;
    default:
      iconUrl = require("leaflet/dist/images/marker-icon.png");
  }
  
  return L.icon({
    iconUrl: iconUrl,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

const INCIDENT_TYPES = [
  "accident",
  "embouteillage",
  "route fermée",
  "contrôle policier",
  "obstacle",
];

// Composant pour capturer les clics sur la carte
const MapClickHandler = ({ onMapClick, isCreating }) => {
  useMapEvents({
    click: (e) => {
      // N'autorise les clics sur la carte que si nous ne sommes pas déjà en train de créer un incident
      if (!isCreating) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
};

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
  const [newIncidentPosition, setNewIncidentPosition] = useState(null);
  const [newIncidentData, setNewIncidentData] = useState({
    type: INCIDENT_TYPES[0],
    description: "",
  });
  const [isCreating, setIsCreating] = useState(false);

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

  const handleMapClick = useCallback((latlng) => {
    if (!token) {
      alert("Vous devez être connecté pour signaler un incident");
      return;
    }
    setNewIncidentPosition(latlng);
    setIsCreating(true);
  }, [token]);

  const handleCreateIncident = async () => {
    if (!newIncidentPosition) return;
    
    try {
      setError(null);
      const res = await apiFetch(
        "http://localhost:3000/incidents",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...newIncidentData,
            latitude: newIncidentPosition.lat,
            longitude: newIncidentPosition.lng,
          }),
        },
        { token, refreshToken, refreshSession, logout }
      );
      
      if (res.status === 401) {
        logout();
        return;
      }
      
      const created = await res.json();
      setIncidents((prev) => [...prev, created]);
      setNewIncidentPosition(null);
      setNewIncidentData({ type: INCIDENT_TYPES[0], description: "" });
      setIsCreating(false);
    } catch (e) {
      if (e.message && e.message.toLowerCase().includes("session")) {
        logout();
      } else {
        setError(e.message);
      }
    }
  };

  const cancelCreation = () => {
    setNewIncidentPosition(null);
    setIsCreating(false);
    setNewIncidentData({ type: INCIDENT_TYPES[0], description: "" });
    // Assurez-vous que la popup se ferme correctement
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
        <MapClickHandler onMapClick={handleMapClick} isCreating={isCreating} />
        
        {/* Marqueur pour le nouvel incident */}
        {newIncidentPosition && isCreating && (
          <Marker 
            position={[newIncidentPosition.lat, newIncidentPosition.lng]}
            icon={getCustomIcon(newIncidentData.type)}
          >
            <Popup minWidth={250} closeButton={false} onClose={cancelCreation} autoPan={false}>
              <h4>Nouvel incident</h4>
              <select
                value={newIncidentData.type}
                onChange={(e) => {
                  setNewIncidentData({ ...newIncidentData, type: e.target.value });
                  // Force le rendu pour mettre à jour l'icône
                }}
                style={{ marginBottom: 6, width: "100%" }}
              >
                {INCIDENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                value={newIncidentData.description}
                onChange={(e) => setNewIncidentData({ ...newIncidentData, description: e.target.value })}
                placeholder="Description (optionnelle)"
                style={{ marginBottom: 6, width: "100%" }}
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "space-between", width: "100%" }}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // Empêche la propagation du clic
                    handleCreateIncident();
                  }}
                  style={{ 
                    backgroundColor: "#4CAF50", 
                    color: "white", 
                    border: "none", 
                    padding: "8px 12px",
                    borderRadius: "4px"
                  }}
                >
                  Créer
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // Empêche la propagation du clic
                    cancelCreation();
                  }}
                  style={{ 
                    backgroundColor: "#f44336", 
                    color: "white", 
                    border: "none", 
                    padding: "8px 12px",
                    borderRadius: "4px"
                  }}
                >
                  Annuler
                </button>
              </div>
              {error && <p style={{ color: "red", fontSize: 12 }}>{error}</p>}
            </Popup>
          </Marker>
        )}
        
        {/* Incidents existants */}
        {incidents &&
          incidents.map((inc) =>
            inc.latitude && inc.longitude ? (
              <Marker
                key={inc.id}
                position={[inc.latitude, inc.longitude]}
                icon={getCustomIcon(inc.type)}
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