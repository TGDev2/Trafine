import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Switch,
  Dimensions,
} from "react-native";
import * as Location from "expo-location";
import { io, Socket } from "socket.io-client";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from "react-native-maps";

// Définition de types clairs pour les coordonnées
type LatLng = { latitude: number; longitude: number };
type CoordinatePair = [number, number];

export default function CalculateRouteScreen() {
  const [currentLocation, setCurrentLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [destination, setDestination] = useState("");
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Initialisation position et région de la carte ---
  useEffect(() => {
    (async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = loc.coords;
        setCurrentLocation(loc.coords);
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } catch {
        Alert.alert("Erreur", "Impossible de récupérer la position actuelle.");
      } finally {
        setLoadingLocation(false);
      }
    })();
    socketRef.current = io("http://localhost:3000", {
      transports: ["websocket"],
    });
  }, []);

  /**
   * Calcul de l’itinéraire et recentrage carte sur l’itinéraire calculé.
   */
  const handleCalculateRoute = useCallback(async () => {
    if (!currentLocation) return;

    setLoadingRoute(true);
    setError(null);

    try {
      // Actualisation de la position
      const loc = await Location.getCurrentPositionAsync({});
      setCurrentLocation(loc.coords);

      const sourceString = `${loc.coords.latitude},${loc.coords.longitude}`;
      const res = await fetch("http://localhost:3000/navigation/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: sourceString,
          destination,
          avoidTolls,
        }),
      });
      if (!res.ok) {
        throw new Error("Erreur lors du calcul de l'itinéraire");
      }

      const data = await res.json();
      setRouteData(data);

      // Recentre la carte sur le premier itinéraire
      const geo = data.routes[0].geometry;
      if (geo?.type === "LineString") {
        // Typage explicite des coordonnées
        const coords: LatLng[] = (geo.coordinates as CoordinatePair[]).map(
          ([lon, lat]: CoordinatePair): LatLng => ({
            latitude: lat,
            longitude: lon,
          })
        );

        const lats = coords.map((c: LatLng) => c.latitude);
        const lons = coords.map((c: LatLng) => c.longitude);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);

        setRegion({
          latitude: (minLat + maxLat) / 2,
          longitude: (minLon + maxLon) / 2,
          latitudeDelta: (maxLat - minLat) * 1.5,
          longitudeDelta: (maxLon - minLon) * 1.5,
        });

        // Souscription aux alertes pour recalculer si besoin
        socketRef.current?.emit("subscribeRoute", {
          geometry: { type: "Feature", geometry: geo, properties: {} },
          threshold: 1000,
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingRoute(false);
    }
  }, [destination, avoidTolls, currentLocation]);

  // Recalcul automatique sur réception d’un incident
  useEffect(() => {
    if (!routeData) return;
    const socket = io("http://localhost:3000", {
      transports: ["websocket"],
    });
    const onIncidentAlert = () => {
      handleCalculateRoute();
    };
    socket.on("incidentAlert", onIncidentAlert);
    return () => {
      socket.off("incidentAlert", onIncidentAlert);
      socket.disconnect();
    };
  }, [routeData, handleCalculateRoute]);

  if (loadingLocation || !region) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
        <Text>Récupération de la position…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* 1. Carte */}
      <MapView provider={PROVIDER_GOOGLE} style={styles.map} region={region}>
        {routeData?.routes?.map((r: any, idx: number) => (
          <Polyline
            key={idx}
            coordinates={(r.geometry.coordinates as CoordinatePair[]).map(
              ([lon, lat]: CoordinatePair): LatLng => ({
                latitude: lat,
                longitude: lon,
              })
            )}
            strokeWidth={4}
            strokeColor="#0a7ea4"
          />
        ))}
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title="Vous"
          />
        )}
      </MapView>

      {/* 2. Formulaire */}
      <View style={styles.controls}>
        <Text style={styles.heading}>Calculer l’itinéraire</Text>

        <View style={styles.inputGroup}>
          <Text>Destination :</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex : Lyon"
            value={destination}
            onChangeText={setDestination}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text>Éviter les péages :</Text>
          <Switch value={avoidTolls} onValueChange={setAvoidTolls} />
        </View>

        <Button
          title="Calculer"
          onPress={handleCalculateRoute}
          disabled={loadingRoute}
        />
        {loadingRoute && <ActivityIndicator style={{ marginTop: 8 }} />}
        {error && <Text style={styles.error}>Erreur : {error}</Text>}
      </View>
    </View>
  );
}

const { height } = Dimensions.get("window");
const mapHeight = height * 0.4;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  map: { width: "100%", height: mapHeight },
  controls: { flex: 1, padding: 12 },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heading: {
    fontSize: 18,
    marginBottom: 12,
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
  },
  error: {
    color: "crimson",
    marginTop: 8,
  },
});
