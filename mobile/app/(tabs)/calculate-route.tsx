import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Switch,
} from "react-native";
import * as Location from "expo-location";
import { io } from "socket.io-client";

export default function CalculateRouteScreen() {
  const [currentLocation, setCurrentLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [destination, setDestination] = useState("");
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [route, setRoute] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Récupération initiale de la position actuelle
  useEffect(() => {
    (async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({});
        setCurrentLocation(loc.coords);
      } catch (err) {
        Alert.alert("Erreur", "Impossible de récupérer la position actuelle.");
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  /**
   * Fonction qui met à jour la position actuelle et calcule l'itinéraire
   */
  const handleCalculateRoute = useCallback(async () => {
    setLoadingRoute(true);
    setError(null);
    try {
      // Actualisation de la position de l'utilisateur
      const loc = await Location.getCurrentPositionAsync({});
      setCurrentLocation(loc.coords);
      const sourceString = `${loc.coords.latitude},${loc.coords.longitude}`;
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
            avoidTolls,
          }),
        }
      );
      if (!response.ok) {
        throw new Error("Erreur lors du calcul de l'itinéraire");
      }
      const data = await response.json();
      setRoute(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingRoute(false);
    }
  }, [destination, avoidTolls]);

  // Remplacement de l'intervalle de polling par une écoute en temps réel via Socket.IO
  useEffect(() => {
    if (!route) return; // On ne souscrit qu'une fois qu'un itinéraire est affiché
    const socket = io("http://localhost:3000", { transports: ["websocket"] });
    const onIncidentAlert = () => {
      // Dès réception d'une alerte, déclenchement du recalcul de l'itinéraire
      handleCalculateRoute();
    };
    socket.on("incidentAlert", onIncidentAlert);
    return () => {
      socket.off("incidentAlert", onIncidentAlert);
      socket.disconnect();
    };
  }, [route, handleCalculateRoute]);

  const handleSubmit = () => {
    handleCalculateRoute();
  };

  if (loadingLocation) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
        <Text>Récupération de la position...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Calculer l'itinéraire</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Destination :</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : Lyon"
          value={destination}
          onChangeText={setDestination}
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Éviter les péages :</Text>
        <Switch value={avoidTolls} onValueChange={setAvoidTolls} />
      </View>
      <Button title="Calculer" onPress={handleSubmit} disabled={loadingRoute} />
      {loadingRoute && (
        <ActivityIndicator
          style={styles.loadingIndicator}
          size="small"
          color="#0a7ea4"
        />
      )}
      {error && <Text style={styles.error}>Erreur : {error}</Text>}
      {route && (
        <View style={styles.routeContainer}>
          <Text style={styles.routeTitle}>Itinéraire calculé</Text>
          <Text>
            <Text style={styles.bold}>Distance :</Text> {route.distance}
          </Text>
          <Text>
            <Text style={styles.bold}>Durée :</Text> {route.duration}
          </Text>
          <Text>
            <Text style={styles.bold}>Type d’itinéraire :</Text>{" "}
            {route.recalculated
              ? "Recalculé en raison d'incidents confirmés"
              : "Optimal"}
          </Text>
          <Text style={styles.instructionsTitle}>Instructions :</Text>
          {route.instructions.map((instr: string, index: number) => (
            <Text key={index}>{instr}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
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
  inputGroup: {
    marginBottom: 10,
  },
  label: {
    marginRight: 10,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 8,
  },
  loadingIndicator: {
    marginTop: 8,
  },
  routeContainer: {
    marginTop: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
  },
  routeTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  instructionsTitle: {
    marginTop: 8,
    fontWeight: "bold",
  },
  bold: {
    fontWeight: "bold",
  },
  error: {
    color: "red",
    marginTop: 8,
  },
});
