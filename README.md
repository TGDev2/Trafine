# Trafine – Suite de navigation temps réel 🇫🇷  

<div align="center">
  <img src="frontend/public/traffine-icon-noBG.png" alt="Trafine logo" height="120"/>
</div>

> Plate-forme **open-source** inspirée de Waze :  
> *Itinéraires optimisés, alertes trafic, signalements communautaires*.

---

## Sommaire
1. [Vue d’ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Démarrage éclair 🍃](#démarrage-éclair-)
4. [Configuration & variables d’environnement](#configuration--variables-denvironnement)
5. [Scripts utiles](#scripts-utiles)
6. [Tests & qualité du code](#tests--qualité-du-code)
7. [Déploiement production](#déploiement-production)
8. [Ressources supplémentaires](#ressources-supplémentaires)

---

## Vue d’ensemble

| Brique        | Rôle principal                                  | Technologie                |
|---------------|-------------------------------------------------|----------------------------|
| **backend**   | API REST + WebSocket, tâches CRON               | NestJS v10, TypeORM, JWT   |
| **frontend**  | Interface web d’administration (SPA)            | React 18, Leaflet, Recharts|
| **mobile**    | Application iOS/Android/Web                     | React Native (Expo SDK 52) |
| **docker**    | Orchestration locale                            | Docker Compose v2          |
| **database**  | Données temps réel & géospatiales               | PostgreSQL 13 + PostGIS    |

Fonctionnalités majeures :

* calcul multi-trajets avec prise en compte du trafic et option **« éviter les péages »** ;
* signalement d’incidents (accident, embouteillage, obstacle, contrôle, route fermée) ;
* validation/infirmation communautaire avec WebSocket temps réel ;
* partage d’itinéraire QR Code + push direct vers l’appli mobile ;
* statistiques & prédictions (embouteillages, pics horaires) dans l’interface web.

---

## Architecture

```mermaid
graph LR
  subgraph Client
    FE["Frontend (React SPA)"]
    MOB["Mobile (Expo)"]
  end

  subgraph Server
    BE["Backend (NestJS)"]
    CRON[Workers / CRON]
  end

  DB[(PostgreSQL + PostGIS)]

  FE -- REST / WS --> BE
  MOB -- REST / WS --> BE
  BE -- SQL + GIS --> DB
  CRON -. read/write .-> DB
````

* **REST** : data CRUD, auth, navigation.
* **WebSocket** : diffusion instantanée des incidents & alertes.
* **CRON** : agrégation statistiques + purge données périmées.

---

## Démarrage éclair 🍃

> **Pré-requis** : Docker ≥ 24 et Docker Compose v2.

```bash
# 1. Clone + .env
# 2. Build & run
docker compose -f docker/docker-compose.yml up --build
```

| Service              | URL par défaut                                        | Notes                             |
| -------------------- | ----------------------------------------------------- | --------------------------------- |
| Backend API          | [http://localhost:3000](http://localhost:3000)        | Swagger : `/api/docs`             |
| Frontend             | [http://localhost:3001](http://localhost:3001)        | SPA admin                         |
| Mobile dev-tools     | [http://localhost:19002](http://localhost:19002)      | Tunnel ngrok auto-ouvert          |
| PostgreSQL + PostGIS | `postgres://postgres:postgres@localhost:5432/trafine` | Extensions PostGIS/Tiger activées |

**Stop :** `docker compose -f docker/docker-compose.yml down`

---

## Configuration & variables d’environnement

| Fichier           | Clé                 | Description                                             |
| ----------------- | ------------------- | ------------------------------------------------------- |
| `backend/.env`    | `ORS_API_KEY`       | Clé **OpenRouteService** (calcul d’itinéraires)         |
|                   | `JWT_SECRET`        | Secret HMAC JWT                                         |
|                   | `DB_URL`            | Chaîne connexion Postgres (*ex. dans Docker : injecté*) |
| `frontend/.env`   | `REACT_APP_API_URL` | URL publique de l’API (HTTP ou HTTPS)                   |
| `mobile/app.json` | `extra.apiUrl`      | Base API dans l’app Expo                                |


---

## Tests & qualité du code

* **Lint** : ESLint + Prettier sur l’ensemble du monorepo.

  ```bash
  npm run lint          # à la racine du service
  ```
* **Tests unitaires** : Jest (backend & mobile) / React Testing Library (frontend).

  ```bash
  npm test --watch
  ```
* **Couverture** : rapports `coverage/` générés après CI.

---

## Ressources supplémentaires

* **docs/technical.md** : architecture détaillée, flux WebSocket, schema BDD.
* **docs/deployment.md** : pipelines GitHub Actions, stratégie blue-green.
* **docs/user-guide.md** : prise en main Web & Mobile (captures d’écran).

---

<div align="center">

*🚀 Bon voyage avec Trafine !*

</div>
```
