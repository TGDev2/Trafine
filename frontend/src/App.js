import React, { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
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
