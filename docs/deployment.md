# Déploiement Trafine 🚀

> Cette page décrit **pas à pas** le déploiement des 4 services
> *(backend, frontend, mobile dev-tools, PostgreSQL/PostGIS)*  
> en **local**, **staging** (VPS Docker) puis **production** (Kubernetes).

---

## 1. Prérequis

| Outil                     | Version mini | Rôle                             |
|---------------------------|--------------|----------------------------------|
| Docker Engine             | 24.x         | Build & runtime                  |
| Docker Compose v2         | 2.20         | Orchestration multi-conteneurs   |
| Node.js                   | 18 LTS       | Scripts auxiliaires, tests       |

---

## 2. Images Docker

| Image                 | Construction                                                                 | Tag par défaut                       |
|-----------------------|-------------------------------------------------------------------------------|--------------------------------------|
| **trafine-backend**   | `backend/Dockerfile` (multi-stage Node → alpine)                              | `trafine/backend:<sha>`              |
| **trafine-frontend**  | `frontend/Dockerfile` (build React puis Nginx alpine)                         | `trafine/frontend:<sha>`             |
| **trafine-mobile**    | `mobile/Dockerfile` (Expo CLI + ngrok)                                        | `trafine/mobile:<sha>`               |
| **postgis/postgis**   | Image officielle – montée avec volume `postgres_data`                         | `postgis/postgis:13-3.1-alpine`      |

Le tag `<sha>` est le hash Git court de la révision ; il est injecté
automatiquement par la CI (`--label org.opencontainers.image.revision=$GITHUB_SHA`).

---

## 3. Orchestration Docker Compose

### 3.1 Profils

Le fichier `docker/docker-compose.yml` expose deux *profiles* :

* **default** (développement local) :  
  `backend`, `frontend`, `mobile`, `postgres`
* **prod** (image « release ») :  
  `backend`, `frontend`, `postgres`  
  > *Le mobile n’est pas démarré en production.*

Exemple :

```bash
# Mode dev + log suivi
docker compose -f docker/docker-compose.yml up -d --build

# Mode production optimisé
docker compose -f docker/docker-compose.yml --profile prod up -d
````
