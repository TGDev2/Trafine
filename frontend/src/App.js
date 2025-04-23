import React from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import Register from "./components/Register";
import Stats from "./components/Stats";
import "./App.css";
import { useAuth } from "./contexts/AuthContext";

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Trafine – Interface web</h1>
        <nav style={{ marginTop: 10, display: "flex", gap: 20 }}>
          <Link to="/">Incidents</Link>
          <Link to="/stats">Statistiques</Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/stats"
            element={
              <PrivateRoute>
                <Stats />
              </PrivateRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
