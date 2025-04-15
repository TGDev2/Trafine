FROM osrm/osrm-backend:latest

# Reconfigurer les sources apt pour Debian Stretch en utilisant uniquement les dépôts archivés nécessaires.
RUN echo "deb http://archive.debian.org/debian stretch main" > /etc/apt/sources.list && \
    echo "deb http://archive.debian.org/debian-security stretch/updates main" >> /etc/apt/sources.list && \
    echo "Acquire::Check-Valid-Until false;" > /etc/apt/apt.conf.d/99no-check-valid-until

# Installer les dépendances nécessaires (wget et bzip2)
RUN apt-get update && \
    apt-get install -y wget bzip2 && \
    rm -rf /var/lib/apt/lists/*

# Créer le dossier /data pour la persistance des données
RUN mkdir -p /data

# Télécharger les données OSM pour la France métropolitaine
RUN wget -nv https://download.geofabrik.de/europe/france-latest.osm.pbf -O /data/france.osm.pbf

# Configurer les variables d'environnement pour optimiser la construction
ENV OSRM_THREADS=4
ENV CONTRACTION_HIERARCHIES=0
ENV MLD=1

# Processus de construction optimisé pour OSRM : extraction, partitionnement et customisation
RUN osrm-extract -p /opt/car.lua /data/france.osm.pbf && \
    osrm-partition /data/france.osrm && \
    osrm-customize /data/france.osrm

# Exposer le port et définir le point d'entrée
EXPOSE 5000
ENTRYPOINT ["osrm-routed", "--algorithm", "mld"]
CMD ["/data/france.osrm"]
