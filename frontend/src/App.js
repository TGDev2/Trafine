import React, { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Vérifier la présence d’un token dans l’URL (après redirection OAuth)
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token");
    if (token) {
      localStorage.setItem("token", token);
      setIsAuthenticated(true);
      // Nettoyer l’URL en retirant les paramètres de requête
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const storedToken = localStorage.getItem("token");
      setIsAuthenticated(!!storedToken);
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Interface de Gestion Trafine</h1>
      </header>
      <main>
        {isAuthenticated ? (
          <Dashboard />
        ) : (
          <Login onLoginSuccess={handleLoginSuccess} />
        )}
      </main>
    </div>
  );
}

export default App;
