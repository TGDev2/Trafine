# Utilisons une image Node 20 LTS (Web Crypto global disponible)
FROM node:20

# Créer un répertoire de travail
WORKDIR /usr/src/app

# Copier uniquement les fichiers package*.json
COPY package*.json ./

# Installer les dépendances (les modules natifs seront compilés ici)
RUN npm install

# Copier le reste du code source
COPY . .

# Construire l’application NestJS
RUN npm run build

# Indiquer le port d’écoute
EXPOSE 3000 3443

# Lancer l’application
CMD ["npm", "run", "start:prod"]
