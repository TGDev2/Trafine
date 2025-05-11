import React, { useState } from "react";
import {
  View,
  Text,
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

export default function RegisterScreen() {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleRegister = async () => {
    if (!username || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
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
        throw new Error(errorData.message || "Échec de l'inscription");
      }

      Alert.alert(
        "Inscription réussie",
        "Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/login"),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Échec de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "google") => {
    setLoading(true);
    try {
      const redirectUri = makeRedirectUri({ native: "myapp://redirect" });
      const authUrl = `${API_URL}/auth/${provider}?redirect_uri=${encodeURIComponent(
        redirectUri
      )}`;

      const startAsyncFunc = (AuthSession as any).startAsync;
      const result = await startAsyncFunc({ authUrl });

      if (result.type === "success" && result.params.access_token) {
        await AsyncStorage.setItem("token", result.params.access_token);
        router.replace("/(tabs)");
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
      <Text style={styles.title}>Créer un compte</Text>

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
            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
            >
              <Text style={styles.registerButtonText}>S'inscrire</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/login")}
              style={styles.loginLink}
            >
              <Text style={styles.loginLinkText}>
                Déjà inscrit ? Retour à la connexion
              </Text>
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
              <Text style={styles.googleButtonText}>Continuer avec Google</Text>
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
  registerButton: {
    backgroundColor: "#0a7ea4",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  registerButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  loginLink: {
    marginTop: 15,
    alignItems: "center",
  },
  loginLinkText: {
    color: "#0a7ea4",
    fontSize: 14,
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
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
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
    fontSize: 16,
    color: "#333",
  },
});
