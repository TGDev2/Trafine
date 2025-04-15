FROM osrm/osrm-backend:v5.27.0

# Installation de wget pour télécharger le fichier OSM pour la France
RUN apt-get update && apt-get install -y wget

# Téléchargement des données OSM pour la France
RUN wget https://download.geofabrik.de/europe/france-latest.osm.pbf

# Extraction des données à l'aide du profil de conduite
RUN osrm-extract -p /opt/car.lua france-latest.osm.pbf

# Partitionnement et customisation pour améliorer les performances
RUN osrm-partition france-latest.osrm
RUN osrm-customize france-latest.osrm

CMD ["osrm-routed", "--algorithm", "mld", "france-latest.osrm"]
