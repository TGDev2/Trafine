import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet, Alert, FlatList } from "react-native";
import { Camera, CameraView, BarcodeScanningResult } from "expo-camera";
import { API_URL } from "@/constants/API";

interface RouteDTO {
  source: string;
  destination: string;
  distance: string;
  duration: string;
  instructions: string[];
  avoidTolls?: boolean;
  recalculated?: boolean;
}

export default function ScanQRScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [routes, setRoutes] = useState<RouteDTO[] | null>(null);

  /* ---------- Permissions caméra ---------- */
  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) =>
      setHasPermission(status === "granted")
    );
  }, []);

  /* ---------- Callback scan QR ---------- */
  /** ----------------------------------------------------------------------------
   *  Helpers
   *  -------------------------------------------------------------------------- */
  /** Normalise une URL : remplace localhost / 127.0.0.1 par l'hôte d'API_URL. */
  const normalizeHost = (raw: string): string => {
    try {
      const parsed = new URL(raw);
      if (["localhost", "127.0.0.1"].includes(parsed.hostname.toLowerCase())) {
        const api = new URL(API_URL);
        parsed.hostname = api.hostname;
        parsed.port = api.port; // garde http / https
        return parsed.toString();
      }
      return raw;
    } catch {
      return raw; // pas une URL valide → on renverra tel quel
    }
  };

  /** Essaye de récupérer {routes:[…]} à partir d'une URL. */
  const fetchRoutes = async (url: string): Promise<RouteDTO[] | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      return Array.isArray(json?.routes) ? json.routes : null;
    } catch {
      return null;
    }
  };

  /** --------------------------------------------------------------------------
   *  Callback scan
   *  ------------------------------------------------------------------------ */
  const handleScan = async ({ data }: BarcodeScanningResult) => {
    setScanned(true);

    /* ---------- 1. QR contient directement le JSON ---------- */
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed?.routes)) return setRoutes(parsed.routes);
      if (Array.isArray(parsed)) return setRoutes(parsed);
    } catch {
      /* pas du JSON → on continue */
    }

    /* ---------- 2. QR contient (ou finit par) une URL ---------- */
    if (data.startsWith("http")) {
      /* a. URL telle quelle */
      const direct = await fetchRoutes(data);
      if (direct) return setRoutes(direct);

      /* b. URL normalisée (localhost → API_URL) */
      const normalised = await fetchRoutes(normalizeHost(data));
      if (normalised) return setRoutes(normalised);

      /* c. même path mais base API_URL (utile si scan /share/ID d'un autre host) */
      try {
        const scanned = new URL(data);
        const api = new URL(API_URL);
        api.pathname = scanned.pathname;
        api.search = scanned.search;
        const fallback = await fetchRoutes(api.toString());
        if (fallback) return setRoutes(fallback);
      } catch {
        /* ignore */
      }
    }

    /* ---------- 3. QR ne contient qu'un identifiant (shareId) ---------- */
    if (/^[a-f0-9-]{24,36}$/i.test(data.trim())) {
      const id = data.trim();
      /* On teste d’abord le nouvel alias, puis l’ancien chemin */
      const candidates = [
        `${API_URL.replace(/\/$/, "")}/share/${id}`,
        `${API_URL.replace(/\/$/, "")}/navigation/share/${id}`,
      ];

      for (const url of candidates) {
        const byId = await fetchRoutes(url);
        if (byId) return setRoutes(byId);
      }
    }

    /* ---------- Échec final ---------- */
    Alert.alert(
      "QR Code invalide",
      "Le QR code scanné ne contient pas d'itinéraire exploitable."
    );
  };

  /* ---------- Rendu conditionnel ---------- */
  if (hasPermission === null)
    return (
      <View style={styles.center}>
        <Text>Demande de permission pour la caméra…</Text>
      </View>
    );

  if (hasPermission === false)
    return (
      <View style={styles.center}>
        <Text>Permission refusée.</Text>
        <Button
          title="Réessayer"
          onPress={() =>
            Camera.requestCameraPermissionsAsync().then(({ status }) =>
              setHasPermission(status === "granted")
            )
          }
        />
      </View>
    );

  return (
    <View style={styles.container}>
      {!scanned ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={handleScan}
        />
      ) : (
        <View style={styles.resultContainer}>
          {routes?.length ? (
            <>
              <Text style={styles.title}>
                {routes.length > 1
                  ? "Itinéraires scannés"
                  : "Itinéraire scanné"}
              </Text>
              <FlatList
                data={routes}
                keyExtractor={(_, i) => i.toString()}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                renderItem={({ item, index }) => (
                  <View>
                    {routes.length > 1 && (
                      <Text style={styles.subtitle}>
                        Alternative {index + 1}
                      </Text>
                    )}
                    <Text>
                      <Text style={styles.bold}>Source :</Text> {item.source}
                    </Text>
                    <Text>
                      <Text style={styles.bold}>Destination :</Text>{" "}
                      {item.destination}
                    </Text>
                    <Text>
                      <Text style={styles.bold}>Distance :</Text>{" "}
                      {item.distance}
                    </Text>
                    <Text>
                      <Text style={styles.bold}>Durée :</Text> {item.duration}
                    </Text>
                    <Text style={styles.bold}>Instructions :</Text>
                    {item.instructions.map((ins, i) => (
                      <Text key={i}>• {ins}</Text>
                    ))}
                  </View>
                )}
              />
            </>
          ) : (
            <Text>Aucun itinéraire valide scanné.</Text>
          )}

          <Button
            title="Scanner à nouveau"
            onPress={() => {
              setScanned(false);
              setRoutes(null);
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  resultContainer: {
    flex: 1,
    padding: 16,
    gap: 12,
    justifyContent: "center",
  },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center" },
  subtitle: { fontSize: 18, fontWeight: "600", marginBottom: 4 },
  bold: { fontWeight: "bold" },
  separator: { height: 1, backgroundColor: "#ccc", marginVertical: 12 },
});
