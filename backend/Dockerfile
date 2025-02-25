# backend/Dockerfile

# Utilisons une image Node 18 en base
FROM node:18

# Créer un répertoire de travail
WORKDIR /usr/src/app

# Copier le package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le code du backend
COPY . .

# Construire l’application NestJS
RUN npm run build

# Indiquer le port d’écoute
EXPOSE 3000

# Lancer l’application
CMD ["npm", "run", "start:prod"]
