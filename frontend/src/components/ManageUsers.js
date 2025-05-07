import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../utils/api";

const ROLES = ["user", "moderator", "admin"];

/**
 * Interface d’administration des comptes :
 * – liste paginée des utilisateurs
 * – changement de rôle via un <select>
 * Nécessite un compte admin (contrôlé par la route <AdminRoute>).
 */
export default function ManageUsers() {
  const { token, refreshToken, refreshSession, logout } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  /* ----------- Chargement initial ----------- */
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

  /* ----------- Mise à jour du rôle ----------- */
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

  /* ----------- UI ----------- */
  if (loading) return <p>Chargement des utilisateurs…</p>;
  if (error) return <p style={{ color: "crimson" }}>Erreur : {error}</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Gestion des utilisateurs</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
