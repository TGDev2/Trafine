import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../style/login.css";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleOAuth = (provider) => {
    const redirectUri = window.location.origin; // http://localhost:3001/ en dev
     window.location.href = `http://localhost:3000/auth/${provider}?redirect_uri=${encodeURIComponent(
       redirectUri
     )}`;

  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:3000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Échec de l’inscription");
      }
      alert("Inscription réussie ! Veuillez vous connecter.");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Logo Traffine */}
        <img
          src="/traffine-icon.png"
          alt="Traffine Logo"
          className="logo"
        />

        <h2>Créer un compte</h2>
        {error && <p className="error-msg">{error}</p>}

        <form className="login-form" onSubmit={handleRegister}>
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
            {loading ? "Création…" : "S’inscrire"}
          </button>
        </form>

        <p className="register-link">
          Déjà inscrit ? <Link to="/login">Retour à la connexion</Link>
        </p>

        <div className="separator">OU</div>

        <div className="social-buttons">
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            className="social-btn"
          >
            <img src="/google.svg" alt="Google logo" />
            Continuer avec Google
          </button>
        </div>
      </div>
    </div>
  );
}
