import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Text,
  Vibration,
  Button,
} from "react-native";
import MapView, { Marker, Callout, Region } from "react-native-maps";
import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { API_URL } from "@/constants/API";

// Définition de l'interface Incident
interface Incident {
  id: number;
  type: string;
  description: string;
  latitude: number;
  longitude: number;
  confirmed: boolean;
  denied: boolean;
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
  const [voteLoadingId, setVoteLoadingId] = useState<number | null>(null);

  useEffect(() => {
    // Connexion WebSocket sécurisée
    const connectSocket = async () => {
      const token = await AsyncStorage.getItem("token");
      const socket = io(API_URL, {
        // ← on pointe sur API_URL
        transports: ["websocket"],
        auth: { token: `Bearer ${token}` },
      });

      socket.on("incidentAlert", (incident: Incident) => {
        // Haptique + notification
        Vibration.vibrate([500, 200, 500]);
        Notifications.scheduleNotificationAsync({
          content: {
            title: "Nouvel incident signalé",
            body: `${incident.type} - ${
              incident.description || "Pas de description"
            }`,
            data: { incident },
          },
          trigger: null,
        });
        setIncidents((prev) => {
          const idx = prev.findIndex((i) => i.id === incident.id);
          if (idx === -1) return [...prev, incident];
          const copy = [...prev];
          copy[idx] = incident;
          return copy;
        });
      });
    };

    connectSocket();

    // Récupération de la position
    (async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } catch {
        Alert.alert("Erreur", "Impossible de récupérer la position actuelle.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Helpers pour confirmer / infirmer
  const confirmIncident = async (id: number) => {
    setVoteLoadingId(id);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/incidents/${id}/confirm`, {
        // ← idem
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Échec de la confirmation");
      const updated = await res.json();
      setIncidents((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    } finally {
      setVoteLoadingId(null);
    }
  };

  const denyIncident = async (id: number) => {
    setVoteLoadingId(id);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/incidents/${id}/deny`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Échec de l'infirmation");
      const updated = await res.json();
      setIncidents((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    } finally {
      setVoteLoadingId(null);
    }
  };

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
      initialRegion={currentLocation ?? DEFAULT_REGION}
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
              <Text style={styles.title}>{incident.type}</Text>
              <Text style={styles.description}>
                {incident.description || "Sans description"}
              </Text>
              <Text style={styles.status}>
                Confirmé : {incident.confirmed ? "Oui" : "Non"} | Inf:{" "}
                {incident.denied ? "Oui" : "Non"}
              </Text>
              <View style={styles.buttonContainer}>
                <Button
                  title="Confirmer"
                  onPress={() => confirmIncident(incident.id)}
                  disabled={voteLoadingId === incident.id || incident.confirmed}
                />
                <Button
                  title="Infirmer"
                  onPress={() => denyIncident(incident.id)}
                  disabled={voteLoadingId === incident.id || incident.denied}
                />
              </View>
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
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  callout: { width: 220 },
  title: { fontSize: 16, fontWeight: "bold" },
  description: { marginVertical: 4 },
  status: { fontStyle: "italic", marginVertical: 4 },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
});
