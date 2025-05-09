import { Stack, useRouter } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Empêche la disparition automatique de l'écran de démarrage
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        // Redirige vers l'écran de login si non authentifié
        router.replace("/login");
      }
      setCheckingAuth(false);
      SplashScreen.hideAsync();
    };
    checkAuth();
  }, [router]);

  if (!fontsLoaded || checkingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack>
        {/* Écran de login en modal */}
        <Stack.Screen
          name="login"
          options={{ headerShown: false, presentation: "modal" }}
        />

        {/* Pile principale (tabs) */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Page 404 */}
        <Stack.Screen name="+not-found" options={{ title: "Oops!" }} />
      </Stack>

      <StatusBar style="auto" />
    </>
  );
}
