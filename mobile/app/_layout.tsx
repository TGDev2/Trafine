import { Stack, useRouter } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, LogBox, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

LogBox.ignoreLogs([
  // nettoie des warnings non-bloquants en dev
  "expo-notifications:",
]);

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [splashHidden, setSplashHidden] = useState(false);
  const router = useRouter();

  /* ---------- Auth rapide ---------- */
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) router.replace("/login");
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, [router]);

  /* ---------- Masquage du splash quand tout est prêt ---------- */
  useEffect(() => {
    if (fontsLoaded && !checkingAuth && !splashHidden) {
      SplashScreen.hideAsync().finally(() => setSplashHidden(true));
    }
  }, [fontsLoaded, checkingAuth, splashHidden]);

  /* Fallback : quoi qu’il arrive on masque au bout de 5 s */
  useEffect(() => {
    const id = setTimeout(() => {
      if (!splashHidden) {
        SplashScreen.hideAsync().finally(() => setSplashHidden(true));
      }
    }, 5000);
    return () => clearTimeout(id);
  }, [splashHidden]);

  /* ---------- Loader minimal ---------- */
  if (!fontsLoaded || checkingAuth)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );

  /* ---------- Pile d’écrans ---------- */
  return (
    <>
      <Stack>
        <Stack.Screen
          name="login"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: "Oops!" }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
