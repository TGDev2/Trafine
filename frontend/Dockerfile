# Étape 1 : Build
FROM node:18 AS build

# Définir le dossier de travail
WORKDIR /usr/src/app

# Copier uniquement les fichiers package*.json
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier tout le code source
COPY . .

# Construire l’application React pour la production
RUN npm run build

# Étape 2 : Serveur NGINX pour héberger les fichiers statiques
FROM nginx:alpine

# Supprime la page index par défaut d’Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copier les fichiers compilés de la première étape
COPY --from=build /usr/src/app/build /usr/share/nginx/html

# Exposer le port 80
EXPOSE 80

# Lancement de Nginx
COPY start.sh /start.sh
RUN chmod +x /start.sh
CMD ["/start.sh"]
