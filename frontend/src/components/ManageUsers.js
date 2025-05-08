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
        if (mounted) setUsers(data);
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

  if (loading) return <p className="users-table-container">Chargement des utilisateurs…</p>;
  if (error) return <p className="users-table-container" style={{ color: "crimson" }}>Erreur : {error}</p>;

  return (
    <div className="users-table-container">
      <h2 className="users-table-title">Gestion des utilisateurs</h2>
      <Link
        to="/"
        className="back-btn"
        style={{
          display: "inline-block",
          marginBottom: "18px",
          background: "#22313a",
          color: "#fff",
          padding: "8px 18px",
          borderRadius: "4px",
          textDecoration: "none",
          border: "1px solid #3d566e",
          fontWeight: 500,
          transition: "background 0.2s"
        }}
      >
        ← Retour aux incidents
      </Link>
      <table className="users-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom d’utilisateur</th>
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
  );
}