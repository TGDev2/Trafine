import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet, Alert } from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";

export default function ScanQRScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState<boolean>(false);
  const [routeData, setRouteData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    setScanned(true);
    try {
      const parsedData = JSON.parse(data);
      setRouteData(parsedData);
    } catch (error) {
      Alert.alert(
        "QR Code invalide",
        "Le QR code scanné ne contient pas un itinéraire valide."
      );
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Demande de permission pour l'appareil photo...</Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>Permission refusée pour l'accès à l'appareil photo.</Text>
        <Button
          title="Réessayer"
          onPress={() => {
            BarCodeScanner.requestPermissionsAsync().then(({ status }) =>
              setHasPermission(status === "granted")
            );
          }}
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
          {routeData ? (
            <>
              <Text style={styles.title}>Itinéraire scanné</Text>
              <Text>
                <Text style={styles.bold}>Source :</Text> {routeData.source}
              </Text>
              <Text>
                <Text style={styles.bold}>Destination :</Text>{" "}
                {routeData.destination}
              </Text>
              <Text>
                <Text style={styles.bold}>Distance :</Text> {routeData.distance}
              </Text>
              <Text>
                <Text style={styles.bold}>Durée :</Text> {routeData.duration}
              </Text>
              <Text style={styles.bold}>Instructions :</Text>
              {routeData.instructions &&
                routeData.instructions.map((instr: string, index: number) => (
                  <Text key={index}>- {instr}</Text>
                ))}
            </>
          ) : (
            <Text>Aucun itinéraire valide scanné.</Text>
          )}
          <Button
            title="Scanner à nouveau"
            onPress={() => {
              setScanned(false);
              setRouteData(null);
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resultContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  bold: {
    fontWeight: "bold",
  },
});
