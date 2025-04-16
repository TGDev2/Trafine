FROM osrm/osrm-backend:v5.25.0

# Configurer les dépôts archivés pour Debian Stretch
RUN echo "deb http://archive.debian.org/debian stretch main contrib non-free" > /etc/apt/sources.list && \
    echo "deb http://archive.debian.org/debian-security stretch/updates main contrib non-free" >> /etc/apt/sources.list && \
    echo "Acquire::Check-Valid-Until false;" > /etc/apt/apt.conf.d/99no-check-valid-until && \
    echo "Acquire::AllowInsecureRepositories true;" > /etc/apt/apt.conf.d/99allow-insecure

# Installer les dépendances avec autorisation des dépôts non sécurisés
RUN apt-get update -o Acquire::AllowInsecureRepositories=true && \
    apt-get install -y --no-install-recommends \
    wget \
    bzip2 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Télécharger les données OSM avec vérification
RUN mkdir -p /data && \
    wget -nv https://download.geofabrik.de/europe/france-latest.osm.pbf -O /data/france-latest.osm.pbf && \
    wget -nv https://download.geofabrik.de/europe/france-latest.osm.pbf.md5 -O /data/france-latest.osm.pbf.md5 && \
    cd /data && md5sum -c france-latest.osm.pbf.md5

COPY car.lua /opt/car.lua

# Build OSRM
RUN osrm-extract -p /opt/car.lua /data/france-latest.osm.pbf && \
    osrm-partition /data/france-latest.osrm && \
    osrm-customize /data/france-latest.osrm

EXPOSE 5000
CMD ["osrm-routed", "--algorithm", "mld", "/data/france-latest.osrm"]