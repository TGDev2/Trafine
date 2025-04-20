import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet, Alert, FlatList } from "react-native";
import {
  Camera,
  CameraView,
  BarcodeScanningResult,
} from "expo-camera";

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
  const handleScan = ({ data }: BarcodeScanningResult) => {
    setScanned(true);
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed?.routes)) setRoutes(parsed.routes);
      else if (Array.isArray(parsed)) setRoutes(parsed);
      else setRoutes([parsed]);
    } catch {
      Alert.alert(
        "QR Code invalide",
        "Le QR code scanné ne contient pas un itinéraire valide."
      );
    }
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
