import React, { useState, useEffect } from "react";
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

export default function CalculateRouteScreen() {
  const [currentLocation, setCurrentLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [destination, setDestination] = useState("");
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [route, setRoute] = useState<any>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission refusée",
          "La géolocalisation est nécessaire pour calculer l'itinéraire."
        );
        setLoadingLocation(false);
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({});
        setCurrentLocation(loc.coords);
      } catch (error) {
        Alert.alert("Erreur", "Impossible de récupérer la position actuelle.");
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  const handleCalculateRoute = async () => {
    if (!currentLocation) {
      Alert.alert("Erreur", "Position actuelle non disponible.");
      return;
    }
    if (!destination) {
      Alert.alert("Erreur", "Veuillez saisir une destination.");
      return;
    }
    setLoadingRoute(true);
    try {
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
            destination: destination,
            avoidTolls: avoidTolls,
          }),
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Erreur lors du calcul de l'itinéraire.");
      }
      const data = await response.json();
      setRoute(data);
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setLoadingRoute(false);
    }
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
      <Button
        title="Calculer"
        onPress={handleCalculateRoute}
        disabled={loadingRoute}
      />
      {loadingRoute && (
        <ActivityIndicator
          style={styles.loadingIndicator}
          size="small"
          color="#0a7ea4"
        />
      )}
      {route && (
        <View style={styles.routeContainer}>
          <Text style={styles.routeTitle}>Itinéraire calculé</Text>
          <Text>Distance : {route.distance}</Text>
          <Text>Durée : {route.duration}</Text>
          <Text>
            Type d'itinéraire : {route.recalculated ? "Recalculé" : "Optimal"}
          </Text>
          <Text style={styles.instructionsTitle}>Instructions :</Text>
          {route.instructions &&
            route.instructions.map((instr: string, index: number) => (
              <Text
                key={index}
                style={styles.instruction}
              >{`\u2022 ${instr}`}</Text>
            ))}
        </View>
      )}
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
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    marginBottom: 4,
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
    marginTop: 20,
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
  instruction: {
    fontSize: 14,
  },
});
