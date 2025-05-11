# Documentation technique Trafine 📚

---

## 1. Vue d’ensemble

```mermaid
flowchart LR
  subgraph Client
    A[Mobile Expo] -->|REST & WS| B(Backend API)
    C[Frontend React] -->|REST & WS| B
  end

  subgraph Core
    B --> D[(PostgreSQL<br/>+ PostGIS)]
    B --> E["OpenRouteService<br/>(external)"]
    B <-->|Socket.IO| A
    B <-->|Socket.IO| C
  end
````

* **Backend (NestJS)** : API REST + WebSocket + Cron prédictions.
* **Frontend** : React 18 + Leaflet, interface d’administration.
* **Mobile** : Expo (12) React Native + Maps + Camera QR.
* **DB** : PostgreSQL 13 + PostGIS 3.1.
* **Découplage micro-services** : chaque domaine logique exposé via module Nest (navigation, incidents, stats, auth).

---

## 2. Backend

### 2.1 Modules

| Module               | Ports exposés                                                                         | Description courte               |                               |
| -------------------- | ------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------- |
| **AuthModule**       | `POST /auth/*`                                                                        | JWT / Refresh / OAuth2 (Google)  |                               |
| **IncidentModule**   | `GET /incidents` `POST /incidents`<br/>\`PATCH /incidents/\:id/{confirm               | deny}\`                          | CRUD + votes, broadcasting WS |
| **NavigationModule** | `POST /navigation/calculate`<br/>`POST /navigation/push`<br/>`POST /navigation/share` | ORS routing, Push Expo, QR share |                               |
| **StatisticsModule** | `GET /statistics` `GET /statistics/hourly`                                            | Agrégation SQL + pré-calcul CRON |                               |

### 2.2 Principales dépendances

| Lib                       | Rôle                 |
| ------------------------- | -------------------- |
| `@nestjs/typeorm`         | ORM + migrations     |
| `socket.io`               | Temps réel           |
| `passport-google-oauth20` | OAuth2               |
| `@nestjs/websockets`      | Temps réel           |
| `@nestjs/throttler`       | Rate-limit           |
| `@nestjs/config`          | Configuration        |
| `@nestjs/schedule`        | Tâches CRON          |
| `class-validator`         | DTO validation       |

### 2.3 Sécurité

* **JWT HS256** (15 min) + refresh 7 j.
* **CSRF double-submit cookie** (`XSRF-TOKEN` + header `X-CSRF-Token`).
* **Rate-limit** (`@nestjs/throttler`) : 100 req/5 min / IP.
* Headers sécurisés via `helmet`.
* Injections SQL évitées par requêtes paramétrées TypeORM.

---

## 3. Base de données

### 3.1 Modèle logique simplifié

```mermaid
erDiagram
  users {
    int id PK
    varchar username
    varchar password_hash
    varchar role
    timestamptz created_at
  }
  incidents {
    int id PK
    varchar type
    text description
    "geometry(point,4326) location"
    bool confirmed
    bool denied
    timestamptz created_at
    int author_id FK
  }
  routes {
    uuid id PK
    geometry linestring_4326
    jsonb meta
    timestamptz created_at
    int author_id FK
  }
  incident_votes {
    int user_id FK
    int incident_id FK
    bool is_confirm
    "PRIMARY KEY (user_id, incident_id)"
  }
```

### 3.2 Indexation géospatiale

```sql
CREATE INDEX idx_incidents_location
  ON incidents
  USING GIST (location);
```

## 3. Temps réel (Socket.IO)

| Événement        | Émetteur         | Payload                                          |
| ---------------- | ---------------- | ------------------------------------------------ |
| `incidentAlert`  | Backend (server) | `{ id, type, description, latitude, longitude }` |
| `routeShared`    | Web ➜ Mobile     | `{ routes: RouteDTO[] }`                         |
| `subscribeRoute` | Client ➜ Server  | GeoJSON `LineString` + `threshold` (mètres)      |

> **Recalcul dynamique** : lorsqu’un incident intersecte la bbox
> d’un itinéraire souscrit, le backend publie `incidentAlert` ciblé.

---

## 4. Algorithme de recalcul

1. **Spatial join** PostGIS :

   ```sql
   SELECT i.*
   FROM incidents i
   WHERE ST_DWithin(i.location, :routeLine::geography, :threshold);
   ```
2. Si résultat > 0 ➜ appel ORS pour recalcul (backend worker).
3. Nouvel itinéraire marqué `recalculated = true` et poussé WS.

---

## 5. Prédiction de congestion (MVP)

* **Cron daily** → calcule moyenne incidents/h sur 15 jours.
* Algorithme naïf (moving average) stocké table `traffic_predictions`.
* Exposé via `GET /statistics/prediction`.
* Améliorations futures : ML TimescaleDB + Prophet.

---

## 6. Frontend React

* **React 18** + **React-Router 6** (SPA).
* **Leaflet** via `react-leaflet` (markers custom).
* **Context API** pour Auth (JWT localStorage).
* **Webpack 5** (create-react-app) – build dans Nginx alpine.
* Lazy-loading pages non critiques (`React.lazy`).
* Styling modular (CSS-modules).

---

## 8. Mobile Expo

| Lib                  | Usage                 |
| -------------------- | --------------------- |
| `expo-router`        | File-based routing    |
| `react-native-maps`  | Affichage itinéraires |
| `expo-camera`        | Scan QR               |
| `expo-notifications` | Alertes incident      |
| `expo-secure-store`  | Stockage tokens       |

Architecture : hooks indépendants (`utils/auth.ts`) + context partage itinéraire.
