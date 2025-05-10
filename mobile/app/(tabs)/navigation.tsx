import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Text,
  Vibration,
  Button,
  TouchableOpacity,
  Modal,
} from "react-native";
import MapView, { Marker, Callout, Region } from "react-native-maps";
import { io, Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { API_URL } from "@/constants/API";
import { getAccessToken, authenticatedFetch } from "@/utils/auth";

// Définition de l'interface Incident
interface Incident {
  id: number;
  type: string;
  description?: string;
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

const INCIDENT_TYPES = {
  TRAFFIC: "Embouteillage",
  ACCIDENT: "Accident",
  OBSTACLE: "Obstacle",
  POLICE: "Contrôle de police",
  CLOSED: "Route fermée"
};

export default function NavigationScreen() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentLocation, setCurrentLocation] = useState<Region | null>(null);
  const [voteLoadingId, setVoteLoadingId] = useState<number | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);

  useEffect(() => {
    // Connexion WebSocket sécurisée
    const connectSocket = async () => {
      const token = await getAccessToken();
      const socket = io(API_URL, {
        transports: ["websocket"],
        auth: token ? { token: `Bearer ${token}` } : undefined,
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
      const res = await authenticatedFetch(
        `${API_URL}/incidents/${id}/confirm`,
        { method: "PATCH" }
      );
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
      const res = await authenticatedFetch(`${API_URL}/incidents/${id}/deny`, {
        method: "PATCH",
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

  // Fonction pour signaler un incident
  const reportIncident = async (type: string) => {
    if (!currentLocation) return;
    
    try {
      const response = await authenticatedFetch(`${API_URL}/incidents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        }),
      });

      if (!response.ok) throw new Error("Échec du signalement");

      const newIncident = await response.json();
      setIncidents(prev => [...prev, newIncident]);
      setShowIncidentModal(false);
      Alert.alert("Succès", "Incident signalé avec succès");
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
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
    <View style={styles.container}>
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
                  Confirmé : {incident.confirmed ? "Oui" : "Non"} | Inf:
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

      {/* Bouton flottant pour signaler un incident */}
      <TouchableOpacity
        style={styles.reportButton}
        onPress={() => setShowIncidentModal(true)}
      >
        <Text style={styles.reportButtonText}>Signaler un incident</Text>
      </TouchableOpacity>

      {/* Modal pour choisir le type d'incident */}
      <Modal
        visible={showIncidentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowIncidentModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Signaler un incident</Text>
            <View style={styles.buttonGrid}>
              {Object.entries(INCIDENT_TYPES).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={styles.incidentButton}
                  onPress={() => reportIncident(label)}
                >
                  <Text style={styles.incidentButtonText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowIncidentModal(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: { 
    flex: 1 
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  callout: { width: 220 },
  title: { fontSize: 16, fontWeight: "bold" },
  description: { marginVertical: 4 },
  status: { fontStyle: "italic", marginVertical: 4 },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  reportButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#0a7ea4',
    padding: 15,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  reportButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  buttonGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  incidentButton: {
    width: '48%',
    backgroundColor: '#0a7ea4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  incidentButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#ccc',
    width: '100%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
