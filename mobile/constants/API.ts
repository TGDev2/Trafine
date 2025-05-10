import Constants from "expo-constants";

/**
 * Base HTTP du backend
 *   • valeur par défaut ⇢ Android émulateur : 10.0.2.2
 *   • sur appareil physique ⇢ passez EXPO_PUBLIC_API_URL ou  ➜ app.json › extra.apiUrl
 */
export const API_URL: string =
  (Constants?.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://10.0.2.2:3000"; // alias de localhost depuis l'AVD
