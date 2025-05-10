import React, { useEffect, useState } from "react";
import { Tabs, useRouter, Redirect } from "expo-router";
import { Alert, ActivityIndicator, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StatusBar } from "expo-status-bar";
import { getAccessToken, clearTokens } from "@/utils/auth";

export default function TabLayout() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Vérifier l'authentification
  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await getAccessToken();
        setIsAuthenticated(!!token);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }
    
    checkAuth();
  }, []);

  // Afficher un loader pendant la vérification
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  // Rediriger vers la page de connexion si non authentifié
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#0a7ea4",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="home" size={28} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="navigation"
          options={{
            title: "Navigation",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="navigation" size={28} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="calculate-route"
          options={{
            title: "Itinéraire",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="directions" size={28} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="report-incident"
          options={{
            title: "Report",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="warning" size={28} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="scan-qr"
          options={{
            title: "Scanner",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="qr-code-scanner" size={28} color={color} />
            ),
          }}
        />

        {/* Onglet Déconnexion */}
        <Tabs.Screen
          name="logout"
          options={{
            title: "Déconnexion",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="logout" size={28} color={color} />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              Alert.alert(
                "Déconnexion",
                "Voulez-vous vraiment vous déconnecter ?",
                [
                  { text: "Annuler", style: "cancel" },
                  {
                    text: "Déconnexion",
                    style: "destructive",
                    onPress: async () => {
                      await clearTokens();
                      router.replace("/login");
                    },
                  },
                ]
              );
            },
          }}
        />
      </Tabs>
      <StatusBar style="auto" />
    </>
  );
}
