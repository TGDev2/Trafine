// Helper HTTP avec rafraîchissement automatique du JWT + CSRF
const CSRF_HEADER = "X-CSRF-Token";

// Lit le cookie XSRF-TOKEN (déposé par le serveur sur les requêtes GET)
function getCsrfToken() {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function apiFetch(
  url,
  options = {},
  { token, refreshToken, refreshSession, logout } = {}
) {
  const attempt = async (bearer) => {
    const headers = { ...options.headers };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;

    // Ajoute le token CSRF sur les requêtes mutatives
    const method = (options.method || "GET").toUpperCase();
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      const csrf = getCsrfToken();
      if (csrf) headers[CSRF_HEADER] = csrf;
    }

    return fetch(url, { ...options, headers, credentials: "include" });
  };

  /* ---------- 1ᵉʳ essai avec le token courant ---------- */
  let response = await attempt(token);

  /* ---------- 401 ? ⇒ on tente un refresh ---------- */
  if (response.status === 401 && refreshToken) {
    try {
      const newToken = await refreshSession();
      response = await attempt(newToken);
    } catch {
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
