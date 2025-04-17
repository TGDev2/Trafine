// Petit helper générique pour toutes les requêtes HTTP.
// S’assure d’ajouter l’entête Authorization et gère les 401 de façon centralisée.
export async function apiFetch(url, options = {}, { token, logout } = {}) {
  const headers = { ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, { ...options, headers });

  // Session expirée : on nettoie et on signale à l’appelant
  if (response.status === 401) {
    logout?.();
    throw new Error("Session expirée – veuillez vous reconnecter.");
  }
  return response;
}
