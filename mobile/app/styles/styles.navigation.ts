import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({ 
   container: { flex: 1 }, 
   map: { flex: 1 }, 
   loaderContainer: { 
     flex: 1, 
     justifyContent: "center", 
     alignItems: "center", 
   }, 
   callout: { width: 220 }, 
   title: { fontSize: 16, fontWeight: "bold" }, 
   description: { marginVertical: 4 }, 
   status: { fontStyle: "italic", marginVertical: 4 }, 
   buttonContainer: { 
     flexDirection: "row", 
     justifyContent: "space-between", 
     marginTop: 6, 
   }, 
   reportButton: { 
     position: "absolute", 
     bottom: 20, 
     right: 20, 
     backgroundColor: "#0a7ea4", 
     padding: 15, 
     borderRadius: 25, 
     elevation: 5, 
     shadowColor: "#000", 
     shadowOffset: { width: 0, height: 2 }, 
     shadowOpacity: 0.25, 
     shadowRadius: 3.84, 
   }, 
   reportButtonText: { color: "white", fontWeight: "bold" }, 
   modalContainer: { 
     flex: 1, 
     justifyContent: "center", 
     alignItems: "center", 
     backgroundColor: "rgba(0,0,0,0.5)", 
   }, 
   modalContent: { 
     backgroundColor: "white", 
     padding: 20, 
     borderRadius: 12, 
     width: "80%", 
     alignItems: "center", 
   }, 
   modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 20 }, 
   buttonGrid: { 
     width: "100%", 
     flexDirection: "row", 
     flexWrap: "wrap", 
     justifyContent: "space-between", 
   }, 
   incidentButton: { 
     width: "48%", 
     backgroundColor: "#0a7ea4", 
     padding: 12, 
     borderRadius: 8, 
     marginBottom: 10, 
     alignItems: "center", 
   }, 
   incidentButtonText: { color: "white", fontWeight: "bold" }, 
   cancelButton: { 
     marginTop: 10, 
     padding: 12, 
     borderRadius: 8, 
     backgroundColor: "#ccc", 
     width: "100%", 
     alignItems: "center", 
   }, 
   cancelButtonText: { color: "white", fontWeight: "bold" }, 
   customMarker: { 
     backgroundColor: 'red', 
     padding: 10, 
     borderRadius: 25, // Augmenté de 20 à 25 
     borderWidth: 3,   // Augmenté de 2 à 3 
     borderColor: 'white', 
     width: 50,        // Augmenté de 40 à 50 
     height: 50,       // Augmenté de 40 à 50 
     justifyContent: 'center', 
     alignItems: 'center', 
   }, 
   markerText: { 
     color: 'white', 
     fontWeight: 'bold', 
     fontSize: 18,     // Augmenté de 16 à 18 
   },
});