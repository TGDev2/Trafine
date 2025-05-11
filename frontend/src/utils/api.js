// Helper HTTP avec rafraîchissement automatique du JWT + CSRF
const CSRF_HEADER = "X-CSRF-Token";

/** URL de base de l'API (définie via .env ➜ REACT_APP_API_URL) */
export const API_BASE = process.env.REACT_APP_API_URL.replace(/\/$/, ""); // retire le / final éventuel

// Lit le cookie XSRF-TOKEN (déposé par le backend)
function getCsrfToken() {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Appel HTTP avec gestion JWT + refresh + CSRF.
 * `endpoint` peut être absolu (`https://…`) ou relatif (`/incidents`).
 */
export async function apiFetch(
  endpoint,
  options = {},
  { token, refreshToken, refreshSession, logout } = {}
) {
  // Préfixe automatique si endpoint relatif
  const url =
    endpoint.startsWith("http://") || endpoint.startsWith("https://")
      ? endpoint
      : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const attempt = async (bearer) => {
    const headers = { ...options.headers };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;

    // CSRF uniquement sur requêtes mutatives
    const method = (options.method || "GET").toUpperCase();
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      const csrf = getCsrfToken();
      if (csrf) headers[CSRF_HEADER] = csrf;
    }

    return fetch(url, { ...options, headers, credentials: "include" });
  };

  /* ---------- 1ᵉ tentative ---------- */
  let response = await attempt(token);

  /* ---------- Refresh si 401 ---------- */
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
