# Utiliser Node 18
FROM node:18

# Créer le dossier de travail
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install
RUN npm install -g @expo/ngrok

# Copier le reste du code
COPY . .


EXPOSE 19000 19001 19002

CMD ["npx", "expo", "start", "--tunnel", "--clear"]
