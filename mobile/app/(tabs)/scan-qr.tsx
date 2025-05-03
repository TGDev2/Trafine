import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet, Alert, FlatList } from "react-native";
import { Camera, CameraView, BarcodeScanningResult } from "expo-camera";

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
  const handleScan = async ({ data }: BarcodeScanningResult) => {
    setScanned(true);

    /* ---------- 1. QR contient directement le JSON ---------- */
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed?.routes)) return setRoutes(parsed.routes);
      if (Array.isArray(parsed)) return setRoutes(parsed);
    } catch (err) {
      console.warn("Échec JSON.parse dans ScanQRScreen :", err);
    }

    /* ---------- 2. QR contient une URL de partage ---------- */
    try {
      if (data.startsWith("http")) {
        const res = await fetch(data);
        if (!res.ok) throw new Error();
        const { routes } = await res.json();
        return setRoutes(routes);
      }
    } catch (err) {
      console.warn("Échec fetch de l'URL scannée dans ScanQRScreen :", err);
    }

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
