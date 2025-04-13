import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  Text,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "expo-router";

const INCIDENT_TYPES = [
  { label: "Accident", value: "accident" },
  { label: "Embouteillage", value: "embouteillage" },
  { label: "Route fermée", value: "route fermée" },
  { label: "Contrôle policier", value: "contrôle policier" },
  { label: "Obstacle", value: "obstacle" },
];

export default function ReportIncidentScreen() {
  const [incidentType, setIncidentType] = useState<string>(
    INCIDENT_TYPES[0].value
  );
  const [description, setDescription] = useState<string>("");
  const [location, setLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [loadingLocation, setLoadingLocation] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const navigation = useNavigation();

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
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      } catch (error) {
        Alert.alert("Erreur", "Impossible de récupérer la position actuelle.");
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (!location) {
      Alert.alert("Erreur", "Aucune position géographique disponible.");
      return;
    }

    setSubmitting(true);
    try {
      // Récupérer le token JWT sauvegardé
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert(
          "Authentification",
          "Vous devez être connecté pour signaler un incident."
        );
        return;
      }

      const response = await fetch("http://localhost:3000/incidents", {
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
        const errorMsg = await response.text();
        throw new Error(
          errorMsg || "Erreur lors de la soumission de l’incident"
        );
      }

      Alert.alert("Succès", "Incident signalé avec succès.");
      // Navigation vers l’accueil ou remise à zéro du formulaire
      navigation.goBack();
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingLocation) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
        <Text>Récupération de la position...</Text>
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
          onValueChange={(value) => setIncidentType(value)}
          style={styles.picker}
        >
          {INCIDENT_TYPES.map((item) => (
            <Picker.Item
              key={item.value}
              label={item.label}
              value={item.value}
            />
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
        title={submitting ? "Envoi en cours..." : "Signaler l'incident"}
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
