import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../utils/api";
import { Link } from "react-router-dom";
import "../style/Users.css";

const ROLES = ["user", "moderator", "admin"];

export default function ManageUsers() {
  const { token, refreshToken, refreshSession, logout } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiFetch(
          "http://localhost:3000/users",
          {},
          { token, refreshToken, refreshSession, logout }
        );
        if (!res.ok) throw new Error("Impossible de récupérer la liste.");
        const data = await res.json();
        // Tri des utilisateurs par ID croissant
        const sortedData = [...data].sort((a, b) => a.id - b.id);
        if (mounted) setUsers(sortedData);
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [token, refreshToken, refreshSession, logout]);

  const handleRoleChange = async (id, newRole) => {
    setUpdatingId(id);
    try {
      const res = await apiFetch(
        `http://localhost:3000/users/${id}/role`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        },
        { token, refreshToken, refreshSession, logout }
      );
      if (!res.ok) throw new Error("Échec de la mise à jour.");
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, role: newRole } : u))
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return (
    <div className="users-layout">
      <div className="users-header">
        <h1>Trafine – Interface web</h1>
        <img src="/traffine-icon-noBG.png" alt="Traffine Logo" className="logo" />
        <nav>
          <Link to="/" className="header-link">
            Incidents
          </Link>
          <Link to="/stats" className="header-link">
            Statistiques
          </Link>
          <Link to="/itineraire" className="header-link">
            Itinéraire
          </Link>
        </nav>
      </div>
      <div className="users-table-container">
        <p>Chargement des utilisateurs…</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="users-layout">
      <div className="users-header">
        <h1>Trafine – Interface web</h1>
        <img src="/traffine-icon-noBG.png" alt="Traffine Logo" className="logo" />
        <nav>
          <Link to="/" className="header-link">
            Incidents
          </Link>
          <Link to="/stats" className="header-link">
            Statistiques
          </Link>
          <Link to="/itineraire" className="header-link">
            Itinéraire
          </Link>
        </nav>
      </div>
      <div className="users-table-container">
        <p style={{ color: "crimson" }}>Erreur : {error}</p>
      </div>
    </div>
  );

  return (
    <div className="users-layout">
      <div className="users-header">
        <h1>Trafine – Interface web</h1>
        <img src="/traffine-icon-noBG.png" alt="Traffine Logo" className="logo" />
        <nav>
          <Link to="/" className="header-link">
            Incidents
          </Link>
          <Link to="/stats" className="header-link">
            Statistiques
          </Link>
          <Link to="/itineraire" className="header-link">
            Itinéraire
          </Link>
        </nav>
      </div>
      
      <div className="users-table-container">
        <h2 className="users-table-title">Gestion des utilisateurs</h2>
        
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom d'utilisateur</th>
              <th>Rôle</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(({ id, username, role }) => (
              <tr key={id}>
                <td>{id}</td>
                <td>{username}</td>
                <td>{role}</td>
                <td>
                  <select
                    value={role}
                    disabled={updatingId === id}
                    onChange={(e) => handleRoleChange(id, e.target.value)}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}