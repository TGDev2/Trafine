# Trafine – Suite de navigation temps réel

Bienvenue dans le dépôt **monorepo** de Trafine.  
Le projet regroupe :

| Dossier      | Rôle                                    | Techno principale |
|--------------|-----------------------------------------|-------------------|
| **backend**  | API REST + WebSocket + CRON            | NestJS / TypeORM  |
| **frontend** | Interface Web d’administration          | React 18 + Leaflet |
| **mobile**   | Application Expo (iOS/Android/Web)      | React Native + Expo |
| **docker**   | Orchestration locale (PostgreSQL + services) | Docker Compose |

---

## Démarrage rapide (Docker)

> Pré-requis : Docker ≥ 24 & Docker Compose v2.

```bash
# 1 / Variables d’environnement
cp backend/.env.example backend/.env 
# ⚠️  Ajoutez votre clé OpenRouteService (ORS_API_KEY) dans backend/.env

# 2 / Lancement complet
docker compose -f docker/docker-compose.yml up --build
```

| Service   | URL par défaut                      | Notes                          |
|-----------|-------------------------------------|--------------------------------|
| Backend   | http://localhost:3000 (HTTP)        | Swagger : `/api/docs`          |
| Frontend  | http://localhost:3001               | React SPA                      |
| Mobile    | Expo dev-tools : http://localhost:19002 | Tunnel ngrok activé            |
| PostGIS   | *localhost*:5432 / `trafine`        | user : postgres / postgres     |

Arrêter : `docker compose -f docker/docker-compose.yml down`

---

## Documentation complète

* **docs/technical.md**  Architecture, modèle de données, sécurité TLS/CSRF, schéma des micro-services.
* **docs/deployment.md**  Pipelines CI/CD, variables ENV, stratégies de mise à l’échelle.
* **docs/user-guide.md**  Guides Web & Mobile (captures d’écran, cas d’usage).