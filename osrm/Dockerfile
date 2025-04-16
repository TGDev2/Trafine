FROM osrm/osrm-backend:latest

# Mettre à jour la configuration apt pour Debian Stretch via les dépôts archivés
RUN echo "Acquire::Check-Valid-Until false;" > /etc/apt/apt.conf.d/99no-check-valid-until && \
    echo "deb http://archive.debian.org/debian stretch main" > /etc/apt/sources.list && \
    echo "deb http://archive.debian.org/debian-security stretch/updates main" >> /etc/apt/sources.list

# Installer les dépendances nécessaires
RUN apt-get update && \
    apt-get install -y --no-install-recommends wget bzip2 && \
    rm -rf /var/lib/apt/lists/*

# Téléchargement et vérification des données OSM pour la France avec désactivation de la vérification du certificat SSL
RUN mkdir -p /data && \
    wget --no-check-certificate -nv https://download.geofabrik.de/europe/france-latest.osm.pbf -O /data/france-latest.osm.pbf && \
    wget --no-check-certificate -nv https://download.geofabrik.de/europe/france-latest.osm.pbf.md5 -O /data/france-latest.osm.pbf.md5 && \
    cd /data && md5sum -c france-latest.osm.pbf.md5

# Copie du profil de routage personnalisé
COPY car.lua /opt/car.lua

# Extraction et préparation des données avec MLD
RUN osrm-extract -p /opt/car.lua /data/france-latest.osm.pbf && \
    osrm-partition /data/france.osrm && \
    osrm-customize /data/france.osrm

# Configuration des performances pour OSRM
ENV OSRM_THREADS=3
ENV MLD=1

# Exposition du port et point d'entrée du service
EXPOSE 5000
ENTRYPOINT ["osrm-routed"]
CMD ["--algorithm", "mld", "--max-table-size", "8000", "/data/france.osrm"]
