import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  /* ---------------- Connexion locale ---------------- */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok)
        throw new Error("Nom d’utilisateur ou mot de passe invalide");
      const { access_token, refresh_token } = await res.json();
      login(access_token, refresh_token);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- OAuth2 ---------------- */
  const handleOAuth = (provider) => {
    const redirectUri = window.location.origin; // http://localhost:3001 en dev
    window.location.href = `http://localhost:3000/auth/${provider}?redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;
  };

  return (
    <div style={{ margin: "0 auto", maxWidth: 400, padding: 20 }}>
      <h2>Connexion</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleLogin}>
        <label>Nom d’utilisateur :</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={{ width: "100%", padding: 8, marginBottom: 10 }}
        />

        <label>Mot de passe :</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: "100%", padding: 8, marginBottom: 10 }}
        />

        <button type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <p style={{ margin: "15px 0" }}>
        Nouveau ? <Link to="/register">Créer un compte</Link>
      </p>

      <hr />

      <p style={{ textAlign: "center" }}>Ou continuer avec</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={() => handleOAuth("google")}>Google</button>
        <button onClick={() => handleOAuth("facebook")}>Facebook</button>
      </div>
    </div>
  );
}
