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
  Vibration,
} from "react-native";
import * as Location from "expo-location";
import { io, Socket } from "socket.io-client";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from "react-native-maps";
import { API_URL } from "@/constants/API";
/* -------------------- Types -------------------- */
type LatLng = { latitude: number; longitude: number };
type CoordinatePair = [number, number];
interface RouteStep {
  instruction: string;
  latitude: number;
  longitude: number;
  distance: number;
  duration: number;
}
interface RouteResult {
  source: string;
  destination: string;
  distance: string;
  duration: string;
  instructions: string[];
  avoidTolls?: boolean;
  recalculated?: boolean;
  geometry: { type: "LineString"; coordinates: CoordinatePair[] };
  steps: RouteStep[];
}
interface RouteAPIResponse {
  routes: RouteResult[];
}

/* ------------------ Helpers ------------------ */
const toRad = (d: number) => (d * Math.PI) / 180;
/** Distance haversine (m). */
function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/** Renvoie le prochain index d’étape à atteindre (< 25 m). */
function nextIdx(steps: RouteStep[], pos: LatLng, idx: number): number {
  const n = Math.min(idx + 1, steps.length - 1);
  return haversine(pos, {
    latitude: steps[n].latitude,
    longitude: steps[n].longitude,
  }) < 25
    ? n
    : idx;
}

/* ================ Composant principal ================ */
export default function CalculateRouteScreen() {
  const [currentLocation, setCurrentLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [destination, setDestination] = useState("");
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeData, setRouteData] = useState<RouteResult[] | null>(null);
  const [nextStepIdx, setNextStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  /* -------- Position initiale -------- */
  useEffect(() => {
    (async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({});
        setCurrentLocation(loc.coords);
        setRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } catch {
        Alert.alert("Erreur", "Impossible de récupérer la position.");
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  /* -------- Socket -------- */
  useEffect(() => {
    socketRef.current = io(API_URL, {
      // ← ici on pointe vers API_URL
      transports: ["websocket"],
    });
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  /* -------- Calcul d’itinéraire -------- */
  const handleCalculateRoute = useCallback(async () => {
    if (!currentLocation || !destination.trim()) return;
    setLoadingRoute(true);
    setError(null);

    try {
      const loc = await Location.getCurrentPositionAsync({});
      setCurrentLocation(loc.coords);

      const res = await fetch(`${API_URL}/navigation/calculate`, {
        // ← ici aussi
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: `${loc.coords.latitude},${loc.coords.longitude}`,
          destination,
          avoidTolls,
        }),
      });
      if (!res.ok) throw new Error("Erreur de calcul d’itinéraire");
      const { routes }: RouteAPIResponse = await res.json();
      setRouteData(routes);
      setNextStepIdx(0);

      /* Recentrage carte */
      const geo = routes[0].geometry;
      const coords = geo.coordinates.map(
        ([lon, lat]): LatLng => ({ latitude: lat, longitude: lon })
      );
      const lats = coords.map((c) => c.latitude);
      const lons = coords.map((c) => c.longitude);
      setRegion({
        latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
        longitude: (Math.min(...lons) + Math.max(...lons)) / 2,
        latitudeDelta: (Math.max(...lats) - Math.min(...lats)) * 1.5,
        longitudeDelta: (Math.max(...lons) - Math.min(...lons)) * 1.5,
      });

      /* Abonnement alertes incidents */
      socketRef.current?.emit("subscribeRoute", {
        geometry: { type: "Feature", geometry: geo, properties: {} },
        threshold: 1000,
      });

      /* Watch GPS pour instructions */
      watchRef.current?.remove();
      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (pos) => {
          setCurrentLocation(pos.coords);
          setNextStepIdx((idx) => nextIdx(routes[0].steps, pos.coords, idx));
        }
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingRoute(false);
    }
  }, [currentLocation, destination, avoidTolls]);

  /* -------- Recalcul sur incidentAlert -------- */
  useEffect(() => {
    const sock = socketRef.current;
    if (!sock || !routeData) return;
    const cb = () => handleCalculateRoute();
    sock.on("incidentAlert", cb);
    return () => {
      sock.off("incidentAlert", cb);
    };
  }, [routeData, handleCalculateRoute]);

  /* -------- Vibration lorsqu’on passe à l’étape suivante -------- */
  useEffect(() => {
    if (nextStepIdx > 0) Vibration.vibrate(100);
  }, [nextStepIdx]);

  /* -------- Nettoyage watcher GPS -------- */
  useEffect(() => () => watchRef.current?.remove(), []);

  /* ----------------- Rendu ----------------- */
  if (loadingLocation || !region) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
        <Text>Initialisation…</Text>
      </View>
    );
  }

  const route = routeData?.[0];
  const step = route?.steps[nextStepIdx];

  return (
    <View style={styles.screen}>
      {/* ---------- Carte ---------- */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        onRegionChangeComplete={setRegion}
      >
        {route && (
          <Polyline
            coordinates={route.geometry.coordinates.map(
              ([lon, lat]): LatLng => ({ latitude: lat, longitude: lon })
            )}
            strokeWidth={6}
          />
        )}
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title="Moi"
            pinColor="blue"
          />
        )}
      </MapView>

      {/* ---------- Commandes ---------- */}
      <View style={styles.controls}>
        <Text style={styles.label}>Destination (lat,lon ou adresse)</Text>
        <TextInput
          style={styles.input}
          value={destination}
          onChangeText={setDestination}
          placeholder="48.8584, 2.2945"
        />
        <View style={styles.row}>
          <Switch value={avoidTolls} onValueChange={setAvoidTolls} />
          <Text style={{ marginLeft: 8 }}>Éviter les péages</Text>
        </View>
        <Button title="Calculer l’itinéraire" onPress={handleCalculateRoute} />

        {/* ---------- Instruction ---------- */}
        {route && step && (
          <View style={styles.instruction}>
            <Text style={styles.instructionTitle}>Prochaine instruction</Text>
            <Text style={styles.instructionText}>{step.instruction}</Text>
            <Text style={styles.instructionSub}>
              Dans {Math.round(step.distance)} m
            </Text>
          </View>
        )}

        {loadingRoute && <ActivityIndicator style={{ marginTop: 8 }} />}
        {error && <Text style={styles.error}>Erreur : {error}</Text>}
      </View>
    </View>
  );
}

/* ----------------- Styles ----------------- */
const { height } = Dimensions.get("window");
const mapH = height * 0.45;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  map: { width: "100%", height: mapH },
  controls: { flex: 1, padding: 12 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", marginVertical: 8 },
  label: { fontWeight: "bold", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  instruction: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#0d6efd",
    borderRadius: 6,
    backgroundColor: "#e7f1ff",
  },
  instructionTitle: { fontWeight: "bold", marginBottom: 4 },
  instructionText: { fontSize: 16 },
  instructionSub: { fontSize: 12, color: "#555" },
  error: { color: "crimson", marginTop: 8 },
});
