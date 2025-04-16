/**
 * NavigationScreen
 *
 * Ce composant affiche la carte des incidents et gère les notifications en temps réel via WebSocket.
 * La connexion est sécurisée en transmettant le token JWT récupéré depuis AsyncStorage.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Text,
  Vibration,
} from "react-native";
import MapView, { Marker, Callout, Polyline, Region } from "react-native-maps";
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

// Définition de l'interface Incident
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

  useEffect(() => {
    // Fonction pour établir une connexion WebSocket sécurisée avec le token JWT
    const connectSocket = async () => {
      const token = await AsyncStorage.getItem("token");
      const socket = io("http://localhost:3000", {
        transports: ["websocket"],
        auth: { token: `Bearer ${token}` },
      });

      socket.on("incidentAlert", (incident: Incident) => {
        // Donner un retour haptique et afficher une notification immédiate
        Vibration.vibrate([500, 200, 500]);
        Notifications.scheduleNotificationAsync({
          content: {
            title: "Nouvel incident signalé",
            body: `${incident.type} - ${
              incident.description || "Pas de description"
            }`,
            data: { incident },
          },
          trigger: null, // Notification immédiate
        });
        setIncidents((prevIncidents) => {
          const index = prevIncidents.findIndex((i) => i.id === incident.id);
          if (index === -1) {
            return [...prevIncidents, incident];
          } else {
            const updatedIncidents = [...prevIncidents];
            updatedIncidents[index] = incident;
            return updatedIncidents;
          }
        });
      });
    };

    connectSocket();

    // Récupération de la localisation actuelle
    (async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } catch (err) {
        Alert.alert("Erreur", "Impossible de récupérer la position actuelle.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
      {incidents.map((incident) => (
        <Marker
          key={incident.id}
          coordinate={{
            latitude: incident.latitude,
            longitude: incident.longitude,
          }}
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
      ))}
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
