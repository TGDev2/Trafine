import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const handleOAuth = (provider) => {
    window.location.href = `${
      process.env.REACT_APP_API_URL || "http://localhost:3000"
    }/auth/${provider}?redirect_uri=${encodeURIComponent(
      window.location.origin
    )}`;
  };
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
      navigate("/login", { replace: true });
      alert("Inscription réussie ! Veuillez vous connecter.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: "0 auto", maxWidth: 400, padding: 20 }}>
      <h2>Créer un compte</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleRegister}>
        <label>Nom d’utilisateur :</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={{ width: "100%", padding: 8, marginBottom: 10 }}
        />

        <label>Mot de passe :</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: "100%", padding: 8, marginBottom: 10 }}
        />

        <button type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Création…" : "S’inscrire"}
        </button>
      </form>

      <p style={{ marginTop: 15 }}>
        Déjà inscrit ? <Link to="/login">Retour à la connexion</Link>
      </p>

      <hr style={{ margin: "20px 0" }} />
      <p style={{ textAlign: "center" }}>Ou s’inscrire avec</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button
          type="button"
          onClick={() => handleOAuth("google")}
          style={{ padding: "8px 16px" }}
        >
          Google
        </button>
        <button
          type="button"
          onClick={() => handleOAuth("facebook")}
          style={{ padding: "8px 16px" }}
        >
          Facebook
        </button>
      </div>
    </div>
  );
}
