import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocalSearchParams } from "expo-router";
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
  TouchableOpacity,
  Modal,
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
import { authenticatedFetch } from "@/utils/auth";
import { styles as importedStyles } from "../styles/style-calcul-route";

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

/** Formater le temps en heures et minutes */
function formatDuration(duration: string | number): string {
  // Si c'est un nombre, on le traite comme des minutes
  if (typeof duration === "number") {
    const minutes = duration;
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}min`
        : `${hours}h`;
    }
  }

  // Si c'est une chaîne, on extrait le nombre
  const match = duration.match(/(\d+)/);
  if (match) {
    const minutes = parseInt(match[1]);
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}min`
        : `${hours}h`;
    }
  }

  // Si on ne peut pas extraire un nombre, on retourne la durée telle quelle
  return duration;
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

/** Traduit les instructions de navigation en français */
function translateInstruction(instruction: string): string {
  return instruction
    .replace(/Continue on/gi, "Continuez sur")
    .replace(/Head (north|south|east|west)/gi, (_, dir) => {
      const directions: Record<string, string> = {
        north: "nord",
        south: "sud",
        east: "est",
        west: "ouest",
      };
      return `Dirigez-vous vers le ${directions[dir.toLowerCase() as keyof typeof directions]
        }`;
    })
    .replace(/Turn right/gi, "Tournez à droite")
    .replace(/Turn left/gi, "Tournez à gauche")
    .replace(/Slight right/gi, "Légèrement à droite")
    .replace(/Slight left/gi, "Légèrement à gauche")
    .replace(/Sharp right/gi, "Virage serré à droite")
    .replace(/Sharp left/gi, "Virage serré à gauche")
    .replace(/Make a U-turn/gi, "Faites demi-tour")
    .replace(/at the roundabout/gi, "au rond-point")
    .replace(/Take the (\d+)\w+ exit/gi, "Prenez la $1e sortie")
    .replace(/onto/gi, "sur")
    .replace(/toward/gi, "vers")
    .replace(/Arrive at/gi, "Arrivée à")
    .replace(/destination/gi, "destination")
    .replace(/You have arrived/gi, "Vous êtes arrivé")
    .replace(/You have arrived/gi, "Vous êtes arrivé")
    .replace(/nordeast/gi, "nord est")
    .replace(/nordwest/gi, "nord ouest")
    .replace(/southeast/gi, "sud est")
    .replace(/southwest/gi, "sud ouest")
    .replace(/Continue on/gi, "Continuez sur")
    .replace(/on/gi, "sur")
    .replace(/onto/gi, "sur")
    .replace(/in/gi, "dans")
    .replace(/for/gi, "pour");
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
  const [showOptions, setShowOptions] = useState(false);
  const { sharedRoutes } = useLocalSearchParams<{ sharedRoutes?: string }>();

  const socketRef = useRef<Socket | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<MapView | null>(null);

  // Fonctions pour zoomer et dézoomer
  const handleZoomIn = useCallback(() => {
    if (region) {
      const newRegion = {
        ...region,
        latitudeDelta: region.latitudeDelta / 2,
        longitudeDelta: region.longitudeDelta / 2,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 300);
    }
  }, [region]);

  const handleZoomOut = useCallback(() => {
    if (region) {
      const newRegion = {
        ...region,
        latitudeDelta: region.latitudeDelta * 2,
        longitudeDelta: region.longitudeDelta * 2,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 300);
    }
  }, [region]);

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

  /* -------- Calcul d'itinéraire -------- */
  const handleCalculateRoute = useCallback(async () => {
    if (!currentLocation || !destination.trim()) return;
    setLoadingRoute(true);
    setError(null);

    try {
      const loc = await Location.getCurrentPositionAsync({});
      setCurrentLocation(loc.coords);

      // Formatage explicite des coordonnées source
      const sourceCoords = `${loc.coords.latitude}, ${loc.coords.longitude}`;

      // Vérifier si la destination est déjà au format coordonnées (contient une virgule et des nombres)
      let destinationCoords = destination.trim();
      if (
        !destination.includes(",") ||
        !/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(destination)
      ) {
        // C'est une adresse, il faut la géocoder
        try {
          const geocodeResult = await Location.geocodeAsync(destination);
          if (geocodeResult && geocodeResult.length > 0) {
            destinationCoords = `${geocodeResult[0].latitude}, ${geocodeResult[0].longitude}`;
          } else {
            throw new Error("Adresse introuvable");
          }
        } catch (geocodeError) {
          throw new Error("Impossible de géocoder cette adresse");
        }
      }

      const res = await authenticatedFetch(`${API_URL}/navigation/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: sourceCoords,
          destination: destinationCoords,
          avoidTolls,
        }),
      });

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ message: "Erreur de calcul d'itinéraire" }));
        throw new Error(errorData.message || "Erreur de calcul d'itinéraire");
      }

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

  /* -------- Si on reçoit un itinéraire partagé, on le charge dès le lancement -------- */
  useEffect(() => {
    if (sharedRoutes && !routeData) {
      try {
        const parsed: RouteResult[] = JSON.parse(sharedRoutes as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRouteData(parsed);
        }
      } catch {
        // si JSON invalide, on ignore et on laisse l’utilisateur calculer normalement
      }
    }
  }, [sharedRoutes]);

  /* ----------------- Rendu ----------------- */
  if (loadingLocation || !region) {
    return (
      <View style={importedStyles.loader}>
        <ActivityIndicator size="large" />
        <Text>Initialisation…</Text>
      </View>
    );
  }

  const route = routeData?.[0];
  const step = route?.steps[nextStepIdx];

  return (
    <View style={importedStyles.screen}>
      {/* ---------- Carte ---------- */}
      <View style={importedStyles.mapContainer}>
        <MapView
          ref={mapRef}
          style={importedStyles.map}
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

        {/* Bouton d'options en haut à gauche */}
        <TouchableOpacity
          style={importedStyles.optionsButton}
          onPress={() => setShowOptions(true)}
        >
          <View style={importedStyles.hamburgerIcon}>
            <View style={importedStyles.hamburgerLine}></View>
            <View style={importedStyles.hamburgerLine}></View>
            <View style={importedStyles.hamburgerLine}></View>
          </View>
        </TouchableOpacity>

        {/* Bouton de recentrage */}
        <TouchableOpacity
          style={importedStyles.recenterButton}
          onPress={() => {
            if (currentLocation) {
              const newRegion = {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              };
              setRegion(newRegion);
              mapRef.current?.animateToRegion(newRegion, 300);
            }
          }}
        >
          <View style={importedStyles.recenterIcon}>
            <View style={importedStyles.recenterCircle}></View>
            <View style={importedStyles.recenterCross}></View>
          </View>
        </TouchableOpacity>

        {/* Boutons de zoom */}
        <View style={importedStyles.zoomButtons}>
          <Button title="+" onPress={handleZoomIn} />
          <View style={{ height: 8 }} />
          <Button title="-" onPress={handleZoomOut} />
        </View>
      </View>

      {/* Modal pour les options */}
      <Modal
        visible={showOptions}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOptions(false)}
      >
        <View style={importedStyles.modalContainer}>
          <View style={importedStyles.modalContent}>
            <Text style={importedStyles.modalTitle}>Options d'itinéraire</Text>

            <Text style={importedStyles.label}>
              Destination (adresse ou lat,lon)
            </Text>
            <TextInput
              style={importedStyles.input}
              value={destination}
              onChangeText={setDestination}
              placeholder="Ex: Marseille, Paris, 48.8584, 2.2945"
            />

            <View style={importedStyles.row}>
              <Switch value={avoidTolls} onValueChange={setAvoidTolls} />
              <Text style={{ marginLeft: 8 }}>Éviter les péages</Text>
            </View>

            <View style={importedStyles.modalButtons}>
              <TouchableOpacity
                style={importedStyles.cancelButton}
                onPress={() => setShowOptions(false)}
              >
                <Text style={importedStyles.buttonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={importedStyles.calculateButton}
                onPress={() => {
                  handleCalculateRoute();
                  setShowOptions(false);
                }}
              >
                <Text style={importedStyles.buttonText}>Calculer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------- Instructions (en bas de l'écran) ---------- */}
      <View style={importedStyles.instructionContainer}>
        {route && step ? (
          <View style={importedStyles.instruction}>
            {/* Temps de trajet estimé */}
            <Text style={importedStyles.estimatedTime}>
              Temps estimé: {formatDuration(route.duration)}
            </Text>
            <Text style={importedStyles.estimatedTime}>
              Distance: {route.distance}
            </Text>
            <Text style={importedStyles.instructionTitle}>
              Prochaine instruction
            </Text>
            <Text style={importedStyles.instructionText}>
              {translateInstruction(step.instruction)}
            </Text>
            <Text style={importedStyles.instructionSub}>
              Dans {Math.round(step.distance)} m
            </Text>
          </View>
        ) : (
          <View style={importedStyles.noRouteContainer}>
            <Text style={importedStyles.noRouteText}>
              Appuyez sur le bouton en haut à gauche pour définir votre
              destination
            </Text>
            {loadingRoute && <ActivityIndicator style={{ marginTop: 8 }} />}
            {error && (
              <Text style={importedStyles.error}>Erreur : {error}</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
