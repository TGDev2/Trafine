import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Correction des icônes par défaut de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const MapView = ({ incidents }) => {
  // Coordonnées par défaut centrées sur la France
  const defaultPosition = [46.603354, 1.8883335];

  return (
    <div style={{ height: "1200px", width: "100%", marginBottom: "20px" }}>
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
          incidents.map((incident) => {
            // On affiche le marqueur uniquement si latitude et longitude sont définis
            if (incident.latitude && incident.longitude) {
              return (
                <Marker
                  key={incident.id}
                  position={[incident.latitude, incident.longitude]}
                >
                  <Popup>
                    <strong>{incident.type}</strong>
                    <br />
                    {incident.description || "Sans description"}
                    <br />
                    Confirmé: {incident.confirmed ? "Oui" : "Non"}
                  </Popup>
                </Marker>
              );
            }
            return null;
          })}
      </MapContainer>
    </div>
  );
};

export default MapView;
