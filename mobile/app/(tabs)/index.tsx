import { Image, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <LinearGradient colors={["#FFFFFF", "#FFFFFF"]} style={styles.background}>
        <ThemedView style={styles.content}>
          <Image
            source={require("@/assets/images/font.png")}
            style={styles.logo}
          />
        </ThemedView>
      </LinearGradient>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: "100%",
  },
  content: {
    flex: 1,
    justifyContent: "center", // Changed from 'flex-start' to 'center'
    alignItems: "center",
    paddingVertical: 20, // Added padding to prevent text cutoff
  },
  logo: {
    width: 400,
    height: 400,
    marginBottom: 40, // Reduced margin to give more space for text
    resizeMode: "contain",
    zIndex: 1,
  },
});
