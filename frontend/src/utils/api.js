// Helper HTTP avec rafraîchissement automatique du JWT
export async function apiFetch(
  url,
  options = {},
  { token, refreshToken, refreshSession, logout } = {}
) {
  const attempt = async (bearer) => {
    const headers = { ...options.headers };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    return fetch(url, { ...options, headers });
  };

  /* ---------- 1ᵉʳ essai avec le token courant ---------- */
  let response = await attempt(token);

  /* ---------- 401 ? ⇒ on tente un refresh ---------- */
  if (response.status === 401 && refreshToken) {
    try {
      const newToken = await refreshSession();
      response = await attempt(newToken);
    } catch {
      // refresh KO → déconnexion forcée
      logout?.();
      throw new Error("Session expirée – veuillez vous reconnecter.");
    }
  }

  if (response.status === 401) {
    logout?.();
    throw new Error("Session expirée – veuillez vous reconnecter.");
  }
  return response;
}
