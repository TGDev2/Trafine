import React from "react";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function RouteMap({ routes, className = '' }) {
  if (!routes || routes.length === 0) {
    return null;
  }

  // Couleurs pour différencier les itinéraires
  const routeColors = ['#2980b9', '#27ae60', '#8e44ad', '#d35400', '#c0392b'];

  // Centrage sur le premier point du premier itinéraire
  const firstCoords = routes[0].geometry.coordinates[0];
  const center = [firstCoords[1], firstCoords[0]];

  return (
    <div style={{ height: "400px", width: "100%", marginBottom: "20px" }} className={className}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routes.map((rt, idx) => {
          const positions = rt.geometry.coordinates.map(([lon, lat]) => [
            lat,
            lon,
          ]);
          return (
            <Polyline
              key={idx}
              positions={positions}
              color={routeColors[idx % routeColors.length]}
              weight={5}
              opacity={0.8}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
