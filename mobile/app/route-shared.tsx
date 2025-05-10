import React, { useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    View,
    StyleSheet,
    FlatList,
    Text,
    Button,
    SafeAreaView,
} from "react-native";
import { RouteResult } from "@/types/routes";

export default function RouteSharedScreen() {
    const router = useRouter();
    const { payload } = useLocalSearchParams<{ payload: string }>();

    const routes: RouteResult[] = useMemo(() => {
        try {
            return JSON.parse(payload ?? "[]");
        } catch {
            return [];
        }
    }, [payload]);

    if (!routes.length) {
        return (
            <SafeAreaView style={styles.center}>
                <Text>Aucun itinéraire à afficher 😕</Text>
                <Button title="Retour" onPress={() => router.back()} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={routes}
                keyExtractor={(_, i) => i.toString()}
                ItemSeparatorComponent={() => <View style={styles.sep} />}
                renderItem={({ item, index }) => (
                    <View style={styles.card}>
                        {routes.length > 1 && (
                            <Text style={styles.subtitle}>Alternative {index + 1}</Text>
                        )}
                        <Text style={styles.row}>
                            <Text style={styles.bold}>Départ :</Text> {item.source}
                        </Text>
                        <Text style={styles.row}>
                            <Text style={styles.bold}>Arrivée :</Text> {item.destination}
                        </Text>
                        <Text style={styles.row}>
                            <Text style={styles.bold}>Distance :</Text> {item.distance}
                        </Text>
                        <Text style={styles.row}>
                            <Text style={styles.bold}>Durée :</Text> {item.duration}
                        </Text>
                    </View>
                )}
            />

            <Button
                title="Démarrer la navigation"
                onPress={() =>
                    router.replace({
                        pathname: "/(tabs)/calculate-route",
                        params: { sharedRoutes: JSON.stringify(routes) },
                    })
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    card: { padding: 12, backgroundColor: "#f1f3f5", borderRadius: 8 },
    bold: { fontWeight: "bold" },
    row: { marginBottom: 4 },
    subtitle: { fontWeight: "600", marginBottom: 6 },
    sep: { height: 12 },
});
