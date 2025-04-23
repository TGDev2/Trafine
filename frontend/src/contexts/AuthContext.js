import React, { createContext, useContext, useEffect, useState } from "react";

/* ----------------  Helpers ---------------- */
const parseJwt = (token) => {
  if (!token) return {};
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
};
const storage = {
  get: (k) => (typeof window !== "undefined" ? localStorage.getItem(k) : null),
  set: (k, v) =>
    typeof window !== "undefined"
      ? v
        ? localStorage.setItem(k, v)
        : localStorage.removeItem(k)
      : undefined,
};

/* ----------------  Contexte ---------------- */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(storage.get("token"));
  const [refreshToken, setRefreshToken] = useState(storage.get("refreshToken"));
  const [role, setRole] = useState(parseJwt(storage.get("token")).role);

  /* persistance */
  useEffect(() => storage.set("token", token), [token]);
  useEffect(() => storage.set("refreshToken", refreshToken), [refreshToken]);

  /* helpers */
  const applyToken = (tok, ref) => {
    setToken(tok);
    setRefreshToken(ref);
    setRole(parseJwt(tok).role);
  };
  const login = applyToken;
  const logout = async () => {
    if (token)
      await fetch("http://localhost:3000/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
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
};
export const useAuth = () => useContext(AuthContext);
