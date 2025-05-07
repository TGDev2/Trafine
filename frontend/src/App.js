import React from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import Register from "./components/Register";
import Stats from "./components/Stats";
import ManageUsers from "./components/ManageUsers";
import "./App.css";
import { useAuth } from "./contexts/AuthContext";

/* Route protégée (auth nécessaire) */
function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

/* Route admin only */
function AdminRoute({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const hideHeaderRoutes = ["/login", "/register"];
  const showHeader = !hideHeaderRoutes.includes(location.pathname);

  return (
    <div className="App">
      {showHeader && (
        <header className="App-header">
          <h1>Trafine – Interface web</h1>
          <nav style={{ marginTop: 10, display: "flex", gap: 20 }}>
            <Link to="/">Incidents</Link>
            <Link to="/stats">Statistiques</Link>
            {isAdmin && <Link to="/users">Utilisateurs</Link>}
          </nav>
        </header>
      )}

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
          <Route
            path="/users"
            element={
              <AdminRoute>
                <ManageUsers />
              </AdminRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
