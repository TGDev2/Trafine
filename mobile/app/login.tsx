import React, { useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert, TextInput, TouchableOpacity, Image, } from "react-native";
import { makeRedirectUri, useAuthRequest, ResponseType } from "expo-auth-session";
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from "expo-router";
import { API_URL } from "@/constants/API";
import { saveTokens } from "@/utils/auth";

// Assurez-vous que le navigateur web se ferme automatiquement après l'authentification
WebBrowser.maybeCompleteAuthSession();

// Configuration pour Google
const discovery = {
  authorizationEndpoint: `${API_URL}/auth/google/authorize`,
  tokenEndpoint: `${API_URL}/auth/google/callback`,
};

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  
  // Configuration de la requête d'authentification
  const redirectUri = makeRedirectUri({ native: "myapp://redirect" });
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: 'your-client-id', // Remplacez par votre ID client
      scopes: ['profile', 'email'],
      redirectUri,
      responseType: ResponseType.Code,
    },
    discovery
  );
  
  // Traitement de la réponse d'authentification
  React.useEffect(() => {
    if (response?.type === 'success' && response.params?.code) {
      handleAuthCode(response.params.code);
    }
  }, [response]);
  
  const handleAuthCode = async (code: string) => {
    setLoading(true);
    try {
      const tokenResponse = await fetch(`${API_URL}/auth/google/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: code,
          redirect_uri: redirectUri
        })
      });
      
      if (!tokenResponse.ok) {
        throw new Error("Échec de l'authentification");
      }
      
      const { access_token, refresh_token } = await tokenResponse.json();
      await saveTokens(access_token, refresh_token);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert("Erreur d'authentification", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      return Alert.alert("Erreur", "Veuillez remplir tous les champs");
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ username, password }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Identifiants incorrects");
      }

      const { access_token, refresh_token } = await res.json();
      if (!access_token || !refresh_token) {
        throw new Error("Réponse du serveur invalide");
      }

      await saveTokens(access_token, refresh_token);
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await promptAsync();
    } catch (err: any) {
      Alert.alert("Erreur d'authentification", err.message);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require("../assets/images/traffine-icon-noBG.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Connexion</Text>
      </View>

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
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Connexion en cours..." : "Se connecter"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => router.push('/register')}
          style={styles.registerLink}
        >
          <Text style={styles.registerLinkText}>
            Nouveau ? Créer un compte
          </Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.orText}>OU</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}
          disabled={loading || !request}
        >
          <Image
            source={require("../assets/images/google.png")}
            style={styles.googleIcon}
          />
          <Text style={styles.googleButtonText}>Se connecter avec Google</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
  },
  formContainer: {
    width: "100%",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#0a7ea4",
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  orText: {
    marginHorizontal: 10,
    color: "#666",
  },
  googleButton: {
    flexDirection: "row",
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
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
  registerLink: {
    marginTop: 15,
    alignItems: 'center',
  },
  registerLinkText: {
    color: '#4c6ef5',
    fontSize: 16,
  },
});
