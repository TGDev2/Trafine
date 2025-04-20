import React, { createContext, useContext, useEffect, useState } from "react";

/** ------------------------------------------------------------------
 *  Helpers de persistance locale
 *  ----------------------------------------------------------------- */
function readFromStorage(key) {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}
function writeToStorage(key, value) {
  if (typeof window === "undefined") return;
  if (value) localStorage.setItem(key, value);
  else localStorage.removeItem(key);
}

/** ------------------------------------------------------------------
 *  Bootstrap : récupère les jetons éventuellement renvoyés par OAuth
 *  ----------------------------------------------------------------- */
function bootstrapAuth() {
  if (typeof window === "undefined") return { token: null, refresh: null };

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const refresh = params.get("refreshToken");

  if (token) writeToStorage("token", token);
  if (refresh) writeToStorage("refreshToken", refresh);

  if (token || refresh) {
    params.delete("token");
    params.delete("refreshToken");
    window.history.replaceState({}, "", window.location.pathname);
  }
  return {
    token: readFromStorage("token"),
    refresh: readFromStorage("refreshToken"),
  };
}

/** ------------------------------------------------------------------
 *  Contexte
 *  ----------------------------------------------------------------- */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const init = bootstrapAuth();
  const [token, setToken] = useState(init.token);
  const [refreshToken, setRefreshToken] = useState(init.refresh);

  /* --------  Effets de persistance -------- */
  useEffect(() => writeToStorage("token", token), [token]);
  useEffect(() => writeToStorage("refreshToken", refreshToken), [refreshToken]);

  /* --------  Login / Logout / Refresh -------- */
  const login = (newToken, newRefresh) => {
    setToken(newToken);
    setRefreshToken(newRefresh);
  };

  const logout = async () => {
    // révocation côté serveur (best effort)
    try {
      if (token)
        await fetch("http://localhost:3000/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
    } catch {
      /* noop ‑ déconnexion locale malgré tout */
    }
    setToken(null);
    setRefreshToken(null);
  };

  /** Tente de rafraîchir la session ; throw si échec */
  const refreshSession = async () => {
    if (!refreshToken) throw new Error("No refresh token");
    const res = await fetch("http://localhost:3000/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) throw new Error("Refresh failed");
    const { access_token, refresh_token } = await res.json();
    login(access_token, refresh_token);
    return access_token;
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        refreshToken,
        isAuthenticated: Boolean(token),
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
