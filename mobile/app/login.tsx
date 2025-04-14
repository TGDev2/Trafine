import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { makeRedirectUri } from "expo-auth-session";
import AuthSession from "expo-auth-session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleOAuthLogin = async (provider: "google" | "facebook") => {
    setLoading(true);
    try {
      // Calcul du redirect URI en fonction du schéma défini dans app.json (ici "myapp")
      const redirectUri = makeRedirectUri({ native: "myapp://redirect" });
      // Construction de l’URL d’authentification, en y incluant le redirect_uri afin que le backend renvoie le token
      const authUrl = `http://localhost:3000/auth/${provider}?redirect_uri=${encodeURIComponent(
        redirectUri
      )}`;

      // On accède à startAsync via un cast, car la propriété n'est pas déclarée dans le typage
      const startAsyncFunc = (AuthSession as any).startAsync;
      const result = await startAsyncFunc({ authUrl });

      if (result.type === "success" && result.params.token) {
        await AsyncStorage.setItem("token", result.params.token);
        router.replace("/" as any);
      } else {
        Alert.alert("Erreur", "Échec de l’authentification.");
      }
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connexion</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#0a7ea4" />
      ) : (
        <>
          <Button
            title="Se connecter avec Google"
            onPress={() => handleOAuthLogin("google")}
          />
          <View style={{ height: 10 }} />
          <Button
            title="Se connecter avec Facebook"
            onPress={() => handleOAuthLogin("facebook")}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});
