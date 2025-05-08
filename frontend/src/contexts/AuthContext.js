import React, { createContext, useContext, useEffect, useState } from "react";

/* ----------------  Helpers ---------------- */
const ENCRYPTION_KEY = "0123456789ABCDEF0123456789ABCDEF"; // Clé AES-256 (32 caractères)

const storage = {
  encrypt: (text) => {
    if (typeof window === "undefined") return text;
    const iv = window.crypto.getRandomValues(new Uint8Array(16));
    const key = new TextEncoder().encode(ENCRYPTION_KEY);
    return window.crypto.subtle
      .importKey("raw", key, { name: "AES-CBC" }, false, ["encrypt"])
      .then((cryptoKey) =>
        window.crypto.subtle.encrypt(
          { name: "AES-CBC", iv },
          cryptoKey,
          new TextEncoder().encode(text)
        )
      )
      .then((encrypted) => {
        const encryptedArray = new Uint8Array(encrypted);
        return `${btoa(String.fromCharCode(...iv))}:${btoa(
          String.fromCharCode(...encryptedArray)
        )}`;
      });
  },
  decrypt: async (encryptedData) => {
    if (typeof window === "undefined" || !encryptedData) return null;
    try {
      const [ivBase64, dataBase64] = encryptedData.split(":");
      const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
      const data = Uint8Array.from(atob(dataBase64), (c) => c.charCodeAt(0));
      const key = new TextEncoder().encode(ENCRYPTION_KEY);
      const cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        key,
        { name: "AES-CBC" },
        false,
        ["decrypt"]
      );
      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-CBC", iv },
        cryptoKey,
        data
      );
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error("Erreur de déchiffrement:", error);
      return null;
    }
  },
  get: async (k) => {
    if (typeof window === "undefined") return null;
    const encrypted = localStorage.getItem(k);
    return encrypted ? await storage.decrypt(encrypted) : null;
  },
  set: async (k, v) => {
    if (typeof window === "undefined") return;
    if (v) {
      const encrypted = await storage.encrypt(v);
      localStorage.setItem(k, encrypted);
    } else {
      localStorage.removeItem(k);
    }
  },
};

function parseJwt(token) {
  if (!token) return {};
  try {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) throw new Error("Token JWT invalide");
    
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = JSON.parse(atob(b64));
    
    // Vérification de l'expiration
    if (decodedPayload.exp && Date.now() >= decodedPayload.exp * 1000) {
      throw new Error("Token expiré");
    }
    
    return decodedPayload;
  } catch (error) {
    console.error("Erreur d'analyse du token JWT:", error);
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
