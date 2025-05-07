import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../style/login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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
      if (!res.ok) throw new Error("Nom d’utilisateur ou mot de passe invalide");
      const { access_token, refresh_token } = await res.json();
      login(access_token, refresh_token);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider) => {
    const redirectUri = window.location.origin; // http://localhost:3001/ en dev
     window.location.href = `http://localhost:3000/auth/${provider}?redirect_uri=${encodeURIComponent(
       redirectUri
     )}`;

  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Logo Traffine */}
        <img src="/traffine-icon.png" alt="Traffine Logo" className="logo" />

        <h2>Connexion</h2>
        {error && <p className="error-msg">{error}</p>}

        <form className="login-form" onSubmit={handleLogin}>
          <label htmlFor="username">Nom d’utilisateur</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="register-link">
          Nouveau ? <Link to="/register">Créer un compte</Link>
        </p>

        <div className="separator">OU</div>

        <div className="social-buttons">
          <button onClick={() => handleOAuth("google")} className="social-btn">
            <img src="/google.svg" alt="Google logo" />
            Continuer avec Google
          </button>
        </div>
      </div>
    </div>
  );
}
