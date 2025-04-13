import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Alert, Text } from "react-native";
import MapView, { Marker, Callout, Region } from "react-native-maps";
import io from "socket.io-client";

interface Incident {
  id: number;
  type: string;
  description: string;
  latitude: number;
  longitude: number;
  confirmed: boolean;
}

const INITIAL_REGION: Region = {
  latitude: 46.603354,
  longitude: 1.8883335,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

export default function NavigationScreen() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  return (
    <MapView style={styles.map} initialRegion={INITIAL_REGION}>
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
