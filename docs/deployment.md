# Guide de déploiement

## 1. Variables d’environnement

| Clé                | Exemple                                          | Rôle                                |
|--------------------|--------------------------------------------------|-------------------------------------|
| `DATABASE_HOST`    | `postgres` (service Docker)                      |                                     |
| `JWT_SECRET`       | *(64 char random)*                               | Signature JWT                       |
| `ENCRYPTION_KEY`   | *(32 char)*                                      | AES-256 dữap                        |
| `ORS_API_KEY`      | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`       | Itinéraires OpenRouteService        |
| `ALLOWED_WEB_ORIGINS` | `https://trafine.app,https://admin.trafine.app` | CORS / WebSocket                    |
| `TLS_CERT_FILE`    | `/etc/ssl/fullchain.pem`                         | TLS                                 |