/**
 * Géocode un nom de ville / adresse en coordonnées [lat, lon] au format string "lat, lon".
 * Utilise Nominatim (OpenStreetMap). Pas de clé, mais respecter le header User‑Agent.
 */
export async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    query
  )}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Trafine-Frontend/0.1 (+https://trafine.local)" },
  });
  if (!res.ok) throw new Error("Erreur réseau lors du géocodage");

  const data = await res.json();
  if (!data.length)
    throw new Error(
      `Lieu introuvable : « ${query} ». Essayez un nom plus précis.`
    );

  const { lat, lon } = data[0];
  return `${parseFloat(lat).toFixed(6)}, ${parseFloat(lon).toFixed(6)}`;
}
