import { Stack, Slot } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, LogBox, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

LogBox.ignoreLogs([
  // nettoie des warnings non-bloquants en dev
]);

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const [isReady, setIsReady] = useState(false);
  const [splashHidden, setSplashHidden] = useState(false);

  /* ---------- Chargement des ressources ---------- */
  useEffect(() => {
    async function prepare() {
      try {
        // Suppression du token pour forcer la déconnexion à chaque démarrage
        await AsyncStorage.removeItem("token");
      } catch (error) {
        console.error("Erreur lors de la préparation:", error);
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  /* ---------- Masquage du splash quand tout est prêt ---------- */
  useEffect(() => {
    if (fontsLoaded && isReady && !splashHidden) {
      SplashScreen.hideAsync().finally(() => setSplashHidden(true));
    }
  }, [fontsLoaded, isReady, splashHidden]);

  /* Fallback : quoi qu'il arrive on masque au bout de 5 s */
  useEffect(() => {
    const id = setTimeout(() => {
      if (!splashHidden) {
        SplashScreen.hideAsync().finally(() => setSplashHidden(true));
      }
    }, 5000);
    return () => clearTimeout(id);
  }, [splashHidden]);

  /* ---------- Loader minimal ---------- */
  if (!fontsLoaded || !isReady)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );

  /* ---------- Pile d'écrans ---------- */
  return (
    <>
      <Stack initialRouteName="login">
        <Stack.Screen
          name="login"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: "Oops!" }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
