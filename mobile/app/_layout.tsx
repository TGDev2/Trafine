import React, { useEffect, useState } from "react";
import { Stack, Redirect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { View, ActivityIndicator, Alert } from "react-native";
import { getAccessToken } from "@/utils/auth";
import { getSocket } from "@/utils/socket";
import { RouteShareProvider, RouteShareContext } from "@/context/RouteShareContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  /* ---------- Auth ---------- */
  useEffect(() => {
    getAccessToken().then((t) => setIsAuthenticated(!!t));
  }, []);

  /* ---------- WebSocket « routeShared » ---------- */
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      const socket = await getSocket();
      socket.on("routeShared", ({ routes }) => {
        Alert.alert(
          "Nouvel itinéraire reçu",
          "Un trajet vient d’être envoyé depuis le Web. Voulez-vous l’ouvrir ?",
          [
            { text: "Plus tard", style: "cancel" },
            {
              text: "Ouvrir",
              onPress: () =>
                router.push({
                  pathname: "/route-shared",
                  params: { payload: JSON.stringify(routes) },
                }),
            },
          ],
        );
      });
    })();
  }, [isAuthenticated]);

  /* ---------- Splash ---------- */
  useEffect(() => {
    if (fontsLoaded && isAuthenticated !== null) SplashScreen.hideAsync();
  }, [fontsLoaded, isAuthenticated]);

  if (!fontsLoaded || isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  return (
    <RouteShareProvider>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="route-shared" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: "Oops!" }} />
      </Stack>
      <StatusBar style="auto" />
    </RouteShareProvider>
  );
}
