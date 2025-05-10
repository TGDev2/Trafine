import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

export const ACCESS_TOKEN_KEY = "trafine_access_token";
export const REFRESH_TOKEN_KEY = "trafine_refresh_token";

/* ------------------------------------------------------------------ */
/*  Helpers de stockage                                               */
/* ------------------------------------------------------------------ */
export async function saveTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

/* ------------------------------------------------------------------ */
/*  Fetch avec rafraîchissement auto                                   */
/* ------------------------------------------------------------------ */
const API_URL: string =
  (Constants?.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://10.0.2.2:3000";

export async function authenticatedFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  let access = await getAccessToken();

  /* ---------- 1. requête initiale ---------- */
  const doFetch = async (): Promise<Response> => {
    const headers = {
      ...(init.headers || {}),
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    };
    return fetch(input, { ...init, headers });
  };

  let res = await doFetch();
  if (res.status !== 401) return res;

  /* ---------- 2. tentative refresh ---------- */
  const refresh = await getRefreshToken();
  if (!refresh) return res; // pas de refresh → on laisse l’erreur

  const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  });

  if (!refreshRes.ok) {
    await clearTokens();
    return res; // 401 d’origine
  }

  const { access_token, refresh_token } = await refreshRes.json();
  if (!access_token || !refresh_token) return res;

  await saveTokens(access_token, refresh_token);
  access = access_token;

  /* ---------- 3. nouvelle tentative ---------- */
  return doFetch();
}
