import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet, Alert, FlatList } from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";

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

  /* -------------------------------------------------- */
  /*  Demande de permission appareil photo              */
  /* -------------------------------------------------- */
  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  /* -------------------------------------------------- */
  /*  Callback de scan : validation + parsing robuste    */
  /* -------------------------------------------------- */
  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    setScanned(true);
    try {
      const parsed = JSON.parse(data);

      // Cas 1 : format attendu { routes: [...] }
      if (parsed && Array.isArray(parsed.routes)) {
        setRoutes(parsed.routes as RouteDTO[]);
        return;
      }

      // Cas 2 : le QR contient directement un tableau ou un objet d’itinéraire
      if (Array.isArray(parsed)) {
        setRoutes(parsed as RouteDTO[]);
        return;
      }
      setRoutes([parsed as RouteDTO]);
    } catch (error) {
      Alert.alert(
        "QR Code invalide",
        "Le QR code scanné ne contient pas un itinéraire valide."
      );
    }
  };

  /* -------------------------------------------------- */
  /*  Rendu                                             */
  /* -------------------------------------------------- */
  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <Text>Demande de permission pour l'appareil photo…</Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text>Permission refusée pour l'accès à l'appareil photo.</Text>
        <Button
          title="Réessayer"
          onPress={() =>
            BarCodeScanner.requestPermissionsAsync().then(({ status }) =>
              setHasPermission(status === "granted")
            )
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!scanned ? (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
      ) : (
        <View style={styles.resultContainer}>
          {routes && routes.length > 0 ? (
            <>
              <Text style={styles.title}>
                {routes.length > 1
                  ? "Itinéraires scannés"
                  : "Itinéraire scanné"}
              </Text>

              <FlatList
                data={routes}
                keyExtractor={(_, idx) => idx.toString()}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                renderItem={({ item, index }) => (
                  <View>
                    {routes.length > 1 && (
                      <Text style={styles.subtitle}>
                        Alternative {index + 1}
                      </Text>
                    )}
                    <Text>
                      <Text style={styles.bold}>Source : </Text>
                      {item.source}
                    </Text>
                    <Text>
                      <Text style={styles.bold}>Destination : </Text>
                      {item.destination}
                    </Text>
                    <Text>
                      <Text style={styles.bold}>Distance : </Text>
                      {item.distance}
                    </Text>
                    <Text>
                      <Text style={styles.bold}>Durée : </Text>
                      {item.duration}
                    </Text>
                    <Text style={styles.bold}>Instructions :</Text>
                    {item.instructions.map((instr, i) => (
                      <Text key={i}>- {instr}</Text>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  resultContainer: {
    flex: 1,
    padding: 16,
    gap: 12,
    alignItems: "stretch",
    justifyContent: "center",
  },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center" },
  subtitle: { fontSize: 18, fontWeight: "600", marginBottom: 4 },
  bold: { fontWeight: "bold" },
  separator: {
    height: 1,
    backgroundColor: "#ccc",
    marginVertical: 12,
  },
});
