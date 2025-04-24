import React, { createContext, useContext, useEffect, useState } from "react";

/* ----------------  Helpers ---------------- */
const storage = {
  get: (k) => (typeof window !== "undefined" ? localStorage.getItem(k) : null),
  set: (k, v) =>
    typeof window !== "undefined"
      ? v
        ? localStorage.setItem(k, v)
        : localStorage.removeItem(k)
      : undefined,
};

function parseJwt(token) {
  if (!token) return {};
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch {
    return {};
  }
}

/**
 * Lit les tokens éventuels dans l’URL (callback OAuth)
 */
function getTokensFromUrl() {
  if (typeof window === "undefined")
    return { initialToken: null, initialRefresh: null };
  const params = new URLSearchParams(window.location.search);
  return {
    initialToken: params.get("token"),
    initialRefresh: params.get("refreshToken"),
  };
}

/* ----------------  Contexte ---------------- */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { initialToken, initialRefresh } = getTokensFromUrl();

  // Initialisation synchrones du state à partir de l’URL ou du localStorage
  const [token, setToken] = useState(initialToken || storage.get("token"));
  const [refreshToken, setRefreshToken] = useState(
    initialRefresh || storage.get("refreshToken")
  );
  const [role, setRole] = useState(
    parseJwt(initialToken || storage.get("token")).role
  );

  // Persistance automatique dans le localStorage
  useEffect(() => {
    if (token) storage.set("token", token);
    else storage.set("token", null);
  }, [token]);
  useEffect(() => {
    if (refreshToken) storage.set("refreshToken", refreshToken);
    else storage.set("refreshToken", null);
  }, [refreshToken]);

  // Nettoyage de l’URL (on enlève les ?token=…&refreshToken=…)
  useEffect(() => {
    if (initialToken && initialRefresh && typeof window !== "undefined") {
      const clean = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, clean);
    }
  }, [initialToken, initialRefresh]);

  /* ----------  Fonctions de gestion du token ---------- */
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
    return access_token;
  };

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