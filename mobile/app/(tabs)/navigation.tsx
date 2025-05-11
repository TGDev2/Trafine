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
import MapView, { Marker, Callout, Region, PROVIDER_GOOGLE } from "react-native-maps";
import { io, Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { API_URL } from "@/constants/API";
import { getAccessToken, authenticatedFetch } from "@/utils/auth";
import { styles } from "@/app/styles/styles.navigation";

/* ------------------------------------------------------------------ */
/* Types — incidents & région par défaut                               */
/* ------------------------------------------------------------------ */
interface Incident {
  id: number;
  type: string;
  description?: string;
  latitude: number | string | null;
  longitude: number | string | null;
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
  CLOSED: "Route fermée",
} as const;

/* ------------------------------------------------------------------ */
/* Normalisation & upsert                                              */
/* ------------------------------------------------------------------ */
function normalizeIncident(inc: Incident): Incident {
  return {
    ...inc,
    latitude: inc.latitude === null ? NaN : Number(inc.latitude),
    longitude: inc.longitude === null ? NaN : Number(inc.longitude),
  };
}

/** Ajoute ou remplace un incident **après** normalisation. */
function upsertIncident(list: Incident[], inc: Incident): Incident[] {
  const safe = normalizeIncident(inc);
  const idx = list.findIndex((i) => i.id === safe.id);
  return idx === -1
    ? [...list, safe]
    : list.map((i) => (i.id === safe.id ? safe : i));
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                 */
/* ------------------------------------------------------------------ */
export default function NavigationScreen() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentLocation, setCurrentLocation] = useState<Region | null>(null);
  const [voteLoadingId, setVoteLoadingId] = useState<number | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);

  /* -------------------- Connexion WebSocket -------------------- */
  useEffect(() => {
    const connectSocket = async () => {
      const token = await getAccessToken();
      const socket: Socket = io(API_URL, {
        transports: ["websocket"],
        auth: token ? { token: `Bearer ${token}` } : undefined,
      });

      socket.on("incidentAlert", (incident: Incident) => {
        /* Vibration + notif locale */
        Vibration.vibrate([500, 200, 500]);
        Notifications.scheduleNotificationAsync({
          content: {
            title: "Nouvel incident signalé",
            body: `${incident.type} — ${incident.description || "Pas de description"
              }`,
            data: { incident },
          },
          trigger: null,
        });

        setIncidents((prev) => upsertIncident(prev, incident));
        
        // Forcer un rafraîchissement des incidents depuis le serveur
        fetchIncidents();
      });
    };

    /* Position courante */
    (async () => {
      connectSocket();
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

    // Ajout du chargement initial des incidents
    const fetchIncidents = async () => {
      try {
        const response = await authenticatedFetch(`${API_URL}/incidents`);
        if (!response.ok) throw new Error("Échec de récupération des incidents");
        const data = await response.json();
        console.log("Incidents récupérés:", data);
        setIncidents(data.map(normalizeIncident));
      } catch (error) {
        console.error("Erreur:", error);
      }
    };
    
    fetchIncidents();
  }, []);

  /* --------------------------- Votes --------------------------- */
  const confirmIncident = async (id: number) => {
    setVoteLoadingId(id);
    try {
      const res = await authenticatedFetch(
        `${API_URL}/incidents/${id}/confirm`,
        { method: "PATCH" }
      );
      if (!res.ok) throw new Error("Échec de la confirmation");
      const updated = await res.json();
      setIncidents((prev) => upsertIncident(prev, updated));
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
      setIncidents((prev) => upsertIncident(prev, updated));
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    } finally {
      setVoteLoadingId(null);
    }
  };

  /* ------------------- Signalement mobile --------------------- */
  const reportIncident = async (type: string) => {
    if (!currentLocation) return;

    try {
      const response = await authenticatedFetch(`${API_URL}/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        }),
      });

      if (!response.ok) throw new Error("Échec du signalement");

      const newIncident: Incident = await response.json();
      console.log("Nouvel incident créé:", newIncident);
      /* Garantir l'unicité immédiatement, avant de recevoir le WS */
      setIncidents((prev) => upsertIncident(prev, newIncident));

      // Forcer un rafraîchissement des incidents depuis le serveur
      fetchIncidents();

      setShowIncidentModal(false);
      Alert.alert("Succès", "Incident signalé avec succès");
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    }
  };

  // Déplacer fetchIncidents en dehors du useEffect pour pouvoir l'appeler ailleurs
  const fetchIncidents = async () => {
    try {
      const response = await authenticatedFetch(`${API_URL}/incidents`);
      if (!response.ok) throw new Error("Échec de récupération des incidents");
      const data = await response.json();
      console.log("Incidents récupérés:", data);
      setIncidents(data.map(normalizeIncident));
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  /* -------------------- Connexion WebSocket -------------------- */
  useEffect(() => {
    const connectSocket = async () => {
      const token = await getAccessToken();
      const socket: Socket = io(API_URL, {
        transports: ["websocket"],
        auth: token ? { token: `Bearer ${token}` } : undefined,
      });

      socket.on("incidentAlert", (incident: Incident) => {
        /* Vibration + notif locale */
        Vibration.vibrate([500, 200, 500]);
        Notifications.scheduleNotificationAsync({
          content: {
            title: "Nouvel incident signalé",
            body: `${incident.type} — ${incident.description || "Pas de description"
              }`,
            data: { incident },
          },
          trigger: null,
        });

        setIncidents((prev) => upsertIncident(prev, incident));
        
        // Forcer un rafraîchissement des incidents depuis le serveur
        fetchIncidents();
      });
    };

    /* Position courante */
    (async () => {
      connectSocket();
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

    // Configurer un intervalle pour rafraîchir la position toutes les 3 secondes
    const positionInterval = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } catch (error) {
        console.error("Erreur lors du rafraîchissement de la position:", error);
      }
    }, 10000);

    // Chargement initial des incidents
    fetchIncidents();
    
    // Configurer un rafraîchissement périodique des incidents
    const refreshInterval = setInterval(() => {
      fetchIncidents();
    }, 30000);
    
    // Nettoyer les intervalles lors du démontage du composant
    return () => {
      clearInterval(refreshInterval);
      clearInterval(positionInterval);
    };
  }, []);

  /* ---------------------------- Rendu ---------------------------- */
  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  // Débogage des incidents filtrés
  console.log("Incidents filtrés:", incidents.filter(
    (i) => Number.isFinite(i.latitude) && Number.isFinite(i.longitude)
  ));

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={currentLocation ?? DEFAULT_REGION}
        key={incidents.length}
      >
        {incidents
          .filter(
            (i) => Number.isFinite(i.latitude) && Number.isFinite(i.longitude)
          )
          .map((incident) => {
            const lat = Number(incident.latitude);
            const lng = Number(incident.longitude);
            console.log(`Incident ${incident.id}: lat=${lat}, lng=${lng}`);
            return (
              <Marker
                key={incident.id}
                coordinate={{
                  latitude: lat,
                  longitude: lng,
                }}
                pinColor="red"
              >
                <View style={styles.customMarker}>
                  <Text style={styles.markerText}>{incident.type.charAt(0)}</Text>
                </View>
                <Callout>
                  <View style={styles.callout}>
                    <Text style={styles.title}>{incident.type}</Text>
                    <Text style={styles.description}>
                      {incident.description || "Sans description"}
                    </Text>
                    <Text style={styles.status}>
                      Confirmé : {incident.confirmed ? "Oui" : "Non"} | Inf :
                      {incident.denied ? "Oui" : "Non"}
                    </Text>
                    <View style={styles.buttonContainer}>
                      <Button
                        title="Confirmer"
                        onPress={() => confirmIncident(incident.id)}
                        disabled={
                          voteLoadingId === incident.id || incident.confirmed
                        }
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
            );
          })}

        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Ma position"
            pinColor="blue"
          />
        )}
      </MapView>

      {/* --------- Bouton flottant « Signaler » --------- */}
      <TouchableOpacity
        style={styles.reportButton}
        onPress={() => setShowIncidentModal(true)}
      >
        <Text style={styles.reportButtonText}>Signaler un incident</Text>
      </TouchableOpacity>

      {/* --------- Modal type d'incident --------- */}
      <Modal
        visible={showIncidentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIncidentModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Signaler un incident</Text>
            <View style={styles.buttonGrid}>
              {Object.values(INCIDENT_TYPES).map((label) => (
                <TouchableOpacity
                  key={label}
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
};
