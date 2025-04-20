import React, { createContext, useContext, useEffect, useState } from "react";

/**
 * Extrait éventuellement les paramètres ?token=…&refreshToken=… après
 * un retour OAuth, les stocke en local et purifie l’URL.
 */
function bootstrapToken() {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get("token");
  const refreshToken = params.get("refreshToken"); // prêt pour les évolutions

  if (accessToken) {
    localStorage.setItem("token", accessToken);
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }

    // Supprime les paramètres sensibles de l’URL sans recharger la page
    params.delete("token");
    params.delete("refreshToken");
    const newQuery = params.toString();
    const newUrl =
      window.location.pathname +
      (newQuery ? `?${newQuery}` : "") +
      window.location.hash;
    window.history.replaceState({}, "", newUrl);

    return accessToken;
  }

  return localStorage.getItem("token") || null;
}

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(bootstrapToken);

  /* --- Persistance / épuration locale --- */
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
    }
  }, [token]);

  const login = (newToken) => setToken(newToken);
  const logout = () => setToken(null);

  return (
    <AuthContext.Provider
      value={{ token, login, logout, isAuthenticated: Boolean(token) }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
