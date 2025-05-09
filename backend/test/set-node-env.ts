/**
 * Jest – configuration globale
 *
 * Les suites sont exécutées sans shell, donc sans variables d’environnement ;
 * pour garantir l’isolation réseau, on force explicitement NODE_ENV="test".
 * D’autres variables (clé ORS, etc.) peuvent être placées ici si besoin.
 */
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Valeur factice pour éviter toute alerte éventuelle
process.env.ORS_API_KEY = process.env.ORS_API_KEY ?? 'dummy';
