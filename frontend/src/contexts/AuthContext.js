import React, { createContext, useContext, useEffect, useState } from "react";

/* ----------------  Helpers ---------------- */
// Stockage synchrone : lecture/écriture directes pour éviter le flash de déconnexion.
const storage = {
  get: (k) => (typeof window !== "undefined" ? localStorage.getItem(k) : null),
  set: (k, v) => {
    if (typeof window === "undefined") return;
    v ? localStorage.setItem(k, v) : localStorage.removeItem(k);
  },
};

// Analyse simple du JWT pour en extraire le rôle et vérifier l'expiration
function parseJwt(token) {
  if (!token) return {};
  const [, payload] = token.split(".");
  const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = JSON.parse(atob(b64));
  if (decoded.exp && decoded.exp * 1000 <= Date.now()) {
    throw new Error("Token expiré");
  }
  return decoded;
}

// Lit les tokens éventuels dans l’URL (callback OAuth)
function getTokensFromUrl() {
  if (typeof window === "undefined")
    return { initialToken: null, initialRefresh: null };
  const params = new URLSearchParams(window.location.search);
  return {
    initialToken: params.get("token"),
    initialRefresh: params.get("refreshToken"),
  };
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { initialToken, initialRefresh } = getTokensFromUrl();

  // ----------  États synchrones dès le premier rendu ----------
  const [token, setToken] = useState(
    initialToken || storage.get("token") || null
  );
  const [refreshToken, setRefreshToken] = useState(
    initialRefresh || storage.get("refreshToken") || null
  );
  const [role, setRole] = useState(() => {
    try {
      return token ? parseJwt(token).role : null;
    } catch {
      return null;
    }
  });

  const applyToken = (newToken, newRefresh) => {
    setToken(newToken);
    setRefreshToken(newRefresh);
    setRole(parseJwt(newToken).role);
  };
  const login = applyToken;

  const logout = async () => {
    if (token) {
      await fetch("http://localhost:3000/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setToken(null);
    setRefreshToken(null);
    setRole(null);
  };

  const refreshSession = async () => {
    const res = await fetch("http://localhost:3000/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) throw new Error("Refresh failed");
    const { access_token, refresh_token } = await res.json();
    applyToken(access_token, refresh_token);
    return { access_token, refresh_token };
  };

  // Persistance automatique dans le localStorage
  useEffect(() => storage.set("token", token), [token]);
  useEffect(() => storage.set("refreshToken", refreshToken), [refreshToken]);

  // Nettoyage de l’URL (on enlève les ?token=…&refreshToken=…)
  useEffect(() => {
    if (initialToken && initialRefresh && typeof window !== "undefined") {
      const clean = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, clean);
    }
  }, [initialToken, initialRefresh]);

  return (
    <AuthContext.Provider
      value={{
        token,
        refreshToken,
        role,
        isAuthenticated: Boolean(token),
        isAdmin: role === "admin",
        isModerator: role === "moderator" || role === "admin",
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
