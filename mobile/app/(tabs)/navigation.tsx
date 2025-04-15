import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Alert, Text } from "react-native";
import MapView, { Marker, Callout, Polyline, Region } from "react-native-maps";
import io from "socket.io-client";
import * as Location from "expo-location";

interface Incident {
  id: number;
  type: string;
  description: string;
  latitude: number;
  longitude: number;
  confirmed: boolean;
}

const DEFAULT_REGION: Region = {
  latitude: 46.603354,
  longitude: 1.8883335,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

export default function NavigationScreen() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentLocation, setCurrentLocation] = useState<Region | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);

  // Récupération initiale des incidents via REST
  useEffect(() => {
    fetch("http://localhost:3000/incidents")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Erreur lors de la récupération des incidents");
        }
        return response.json();
      })
      .then((data: Incident[]) => {
        setIncidents(data);
      })
      .catch((error) => {
        Alert.alert("Erreur", error.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Établir une connexion Socket.IO pour recevoir les alertes en temps réel
  useEffect(() => {
    const socket = io("http://localhost:3000", { transports: ["websocket"] });

    socket.on("incidentAlert", (incident: Incident) => {
      setIncidents((prevIncidents) => {
        const index = prevIncidents.findIndex((i) => i.id === incident.id);
        if (index === -1) {
          // Nouvel incident, ajout à la liste
          return [...prevIncidents, incident];
        } else {
          // Mise à jour de l’incident existant
          const updatedIncidents = [...prevIncidents];
          updatedIncidents[index] = incident;
          return updatedIncidents;
        }
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Mise en place de la géolocalisation en temps réel
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission refusée",
          "La géolocalisation est nécessaire pour cette fonctionnalité."
        );
        return;
      }
      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          setCurrentLocation({
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      );
      return () => {
        locationSubscription.remove();
      };
    })();
  }, []);

  // Récupération de l'itinéraire calculé lorsque la position actuelle est disponible
  useEffect(() => {
    const fetchRoute = async () => {
      if (currentLocation) {
        try {
          // Pour la bêta, destination fixe : Lyon (coordonnées approximatives)
          const destination = "45.7640,4.8357";
          const sourceString = `${currentLocation.latitude},${currentLocation.longitude}`;
          const response = await fetch(
            "http://localhost:3000/navigation/calculate",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                source: sourceString,
                destination,
                avoidTolls: false,
              }),
            }
          );
          if (!response.ok) {
            throw new Error("Erreur lors du calcul de l'itinéraire");
          }
          const data = await response.json();
          if (
            data.routes &&
            data.routes.length > 0 &&
            data.routes[0].geometry
          ) {
            // On suppose ici que la géométrie est au format GeoJSON LineString
            const geoJson = data.routes[0].geometry;
            if (
              geoJson.type === "LineString" &&
              Array.isArray(geoJson.coordinates)
            ) {
              // Transformer chaque paire [lon, lat] en { latitude, longitude }
              const coords = geoJson.coordinates.map((coord: number[]) => ({
                latitude: coord[1],
                longitude: coord[0],
              }));
              setRouteCoordinates(coords);
            }
          }
        } catch (error: any) {
          Alert.alert("Erreur", error.message);
        }
      }
    };

    fetchRoute();
  }, [currentLocation]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  return (
    <MapView
      style={styles.map}
      initialRegion={currentLocation ? currentLocation : DEFAULT_REGION}
    >
      {incidents.map((incident) => {
        if (incident.latitude && incident.longitude) {
          return (
            <Marker
              key={incident.id}
              coordinate={{
                latitude: incident.latitude,
                longitude: incident.longitude,
              }}
              pinColor={incident.confirmed ? "green" : "red"}
            >
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{incident.type}</Text>
                  <Text style={styles.calloutDescription}>
                    {incident.description || "Sans description"}
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        }
        return null;
      })}
      {currentLocation && (
        <Marker
          coordinate={{
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          }}
          title="Ma position"
          pinColor="blue"
        />
      )}
      {routeCoordinates.length > 0 && (
        <Polyline
          coordinates={routeCoordinates}
          strokeColor="blue"
          strokeWidth={4}
        />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  callout: {
    width: 200,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  calloutDescription: {
    fontSize: 14,
  },
});
