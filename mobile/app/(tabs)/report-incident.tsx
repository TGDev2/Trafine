import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "expo-router";
import { API_URL } from "@/constants/API";

const INCIDENT_TYPES = [
  { label: "Accident", value: "accident" },
  { label: "Embouteillage", value: "embouteillage" },
  { label: "Route fermée", value: "route fermée" },
  { label: "Contrôle policier", value: "contrôle policier" },
  { label: "Obstacle", value: "obstacle" },
];

export default function ReportIncidentScreen() {
  const navigation = useNavigation();
  const [incidentType, setIncidentType] = useState(INCIDENT_TYPES[0].value);
  const [description, setDescription] = useState("");
  const [location, setLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Récupération de la position
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission refusée",
          "La géolocalisation est nécessaire pour signaler un incident."
        );
        setLoadingLocation(false);
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync();
        setLocation(loc.coords);
      } catch {
        Alert.alert("Erreur", "Impossible de récupérer la position actuelle.");
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  // Envoi du signalement avec authentification
  const handleSubmit = async () => {
    if (!location) {
      Alert.alert(
        "Position inconnue",
        "Impossible de localiser votre position pour le signalement."
      );
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Utilisateur non authentifié");

      const response = await fetch(`${API_URL}/incidents`, {
        // ← ici aussi
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: incidentType,
          description,
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Échec du signalement");
      }

      Alert.alert(
        "Signalement envoyé",
        "Votre signalement a bien été pris en compte."
      );
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingLocation) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
        <Text>Récupération de la position…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Signaler un incident</Text>

      <Text style={styles.label}>Type d’incident :</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={incidentType}
          onValueChange={setIncidentType}
          style={styles.picker}
        >
          {INCIDENT_TYPES.map(({ label, value }) => (
            <Picker.Item key={value} label={label} value={value} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Description (facultatif) :</Text>
      <TextInput
        style={styles.input}
        placeholder="Description de l’incident"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Button
        title={submitting ? "Envoi en cours…" : "Signaler l'incident"}
        onPress={handleSubmit}
        disabled={submitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    marginBottom: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    marginBottom: 16,
  },
  picker: {
    height: 50,
    width: "100%",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 8,
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: "top",
  },
});
