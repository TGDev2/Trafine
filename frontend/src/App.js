import React from "react";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import "./App.css";
import { useAuth } from "./contexts/AuthContext";

function App() {
  const { isAuthenticated, login } = useAuth();

  return (
    <div className="App">
      <header className="App-header">
        <h1>Interface de Gestion Trafine</h1>
      </header>
      <main>
        {isAuthenticated ? <Dashboard /> : <Login onLoginSuccess={login} />}
      </main>
    </div>
  );
}

export default App;
