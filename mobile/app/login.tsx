import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import { makeRedirectUri } from "expo-auth-session";
import AuthSession from "expo-auth-session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { API_URL } from "@/constants/API";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Identifiants incorrects");
      }

      const data = await response.json();
      await AsyncStorage.setItem("token", data.token);
      router.replace("/" as any);
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Échec de la connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "google") => {
    setLoading(true);
    try {
      // Calcul du redirect URI en fonction du schéma défini dans app.json (ici "myapp")
      const redirectUri = makeRedirectUri({ native: "myapp://redirect" });
      // Construction de l'URL d'authentification via API_URL
      const authUrl = `${API_URL}/auth/${provider}?redirect_uri=${encodeURIComponent(
        redirectUri
      )}`;

      // On accède à startAsync via un cast, car la propriété n'est pas déclarée dans le typage
      const startAsyncFunc = (AuthSession as any).startAsync;
      const result = await startAsyncFunc({ authUrl });

      if (result.type === "success" && result.params.token) {
        await AsyncStorage.setItem("token", result.params.token);
        router.replace("/" as any);
      } else {
        Alert.alert("Erreur", "Échec de l'authentification.");
      }
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image 
        source={require("../assets/images/traffine-icon-noBG.png")} 
        style={styles.logo} 
        resizeMode="contain"
      />
      <Text style={styles.title}>Connexion</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#0a7ea4" />
      ) : (
        <>
          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nom d'utilisateur"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Se connecter</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>OU</Text>
            <View style={styles.separatorLine} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => handleOAuthLogin("google")}
          >
            <View style={styles.googleButtonContent}>
              <Image 
                source={require("../assets/images/google.png")} 
                style={styles.googleIcon} 
              />
              <Text style={styles.googleButtonText}>
                Se connecter avec Google
              </Text>
            </View>
          </TouchableOpacity>
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
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    color: "#333",
  },
  formContainer: {
    width: "100%",
    maxWidth: 400,
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: "#0a7ea4",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  loginButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
    marginVertical: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  separatorText: {
    marginHorizontal: 10,
    color: "#777",
  },
  googleButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 12,
    borderRadius: 8,
    width: "100%",
    maxWidth: 400,
  },
  googleButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  googleButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "500",
  },
});
