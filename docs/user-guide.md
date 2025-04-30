# Guide utilisateur

## 1. Application Web

### Connexion
1. Rendez-vous sur **https://admin.trafine.app**  
2. Choisissez **Google** ou **Twitter** (OAuth2)  
3. Première connexion → compte « user ». Un administrateur peut promouvoir en « moderator ».

### Gestion des incidents
* **Créer** : formulaire en haut de page (modérateurs).  
* **Confirmer / Infirmer** : boutons sur chaque carte.  
* **Supprimer** : réservé aux administrateurs.

### Calcul d’itinéraire
1. Renseignez **Départ** / **Arrivée** (adresse ou `lat, lon`).  
2. Option « Éviter les péages ».  
3. Les alternatives s’affichent + carte Leaflet.  
4. **Partager** → QR code intégrant toutes les routes.

## 2. Application mobile (Expo)

| Écran                     | Fonction                          |
|---------------------------|-----------------------------------|
| **Navigation**            | Carte temps-réel + incidents      |
| **Itinéraire**            | Recalcul automatique sur alertes  |
| **Report**                | Signaler un incident (GPS auto)   |
| **Scan QR**               | Charger un itinéraire partagé     |

Notifications et vibration sont activées à l’arrivée d’un nouvel incident proche.

## 3. Rôles & droits

| Rôle       | Créer incident | Valider/Infirmer | Archiver | Supprimer utilisateur |
|------------|---------------|------------------|----------|-----------------------|
| **user**   | –             | ✔                | –        | –                     |
| **moderator** | ✔         | ✔                | ✔        | –                     |
| **admin**  | ✔             | ✔                | ✔        | ✔                     |