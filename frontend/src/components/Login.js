import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

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
      if (!res.ok) throw new Error("Erreur lors de l'authentification");
      const { access_token, refresh_token } = await res.json();
      login(access_token, refresh_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Rediriger l'utilisateur vers l'endpoint OAuth de Google du backend
    window.location.href = "http://localhost:3000/auth/google";
  };

  const handleFacebookLogin = () => {
    // Rediriger l'utilisateur vers l'endpoint OAuth de Facebook du backend
    window.location.href = "http://localhost:3000/auth/facebook";
  };

  return (
    <div style={{ margin: "0 auto", maxWidth: "400px", padding: "20px" }}>
      <h2>Connexion</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: "10px" }}>
          <label>Nom d'utilisateur:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>Mot de passe:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ padding: "10px 20px", marginBottom: "10px" }}
        >
          {loading ? "Connexion en cours..." : "Se connecter"}
        </button>
      </form>
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <p>Ou se connecter avec :</p>
        <button
          onClick={handleGoogleLogin}
          style={{ padding: "10px 20px", marginRight: "10px" }}
        >
          Google
        </button>
        <button onClick={handleFacebookLogin} style={{ padding: "10px 20px" }}>
          Facebook
        </button>
      </div>
    </div>
  );
};

export default Login;
