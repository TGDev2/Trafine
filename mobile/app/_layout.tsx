import React, { useEffect, useState } from "react";
import { Stack, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { View, ActivityIndicator } from "react-native";
import { getAccessToken } from "@/utils/auth";

export default function RootLayout() {
  // On empêche le splash de se cacher automatiquement
  SplashScreen.preventAutoHideAsync();

  // État pour suivre si l'utilisateur est authentifié
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // 1) Charger la police
  const [fontsLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // 2) Vérifier si l'utilisateur est authentifié
  useEffect(() => {
    async function checkAuth() {
      const token = await getAccessToken();
      setIsAuthenticated(!!token);
    }
    
    checkAuth();
  }, []);

  // 3) Cacher le splash dès que la police est prête
  useEffect(() => {
    if (fontsLoaded && isAuthenticated !== null) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isAuthenticated]);

  // 4) Tant que la police n'est pas chargée ou que l'authentification n'est pas vérifiée, on affiche un loader
  if (!fontsLoaded || isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  // 5) Configuration des routes
  return (
    <>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: "Oops!" }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
