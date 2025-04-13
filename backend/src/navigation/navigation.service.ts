import { Injectable } from '@nestjs/common';
import { IncidentService } from '../incident/incident.service';
import * as QRCode from 'qrcode';

@Injectable()
export class NavigationService {
  constructor(private readonly incidentService: IncidentService) {}

  /**
   * Fonction utilitaire pour analyser une chaîne représentant des coordonnées.
   * Ex : "48.8566, 2.3522" sera converti en { latitude: 48.8566, longitude: 2.3522 }
   * @param source Chaîne à analyser.
   * @returns Un objet contenant latitude et longitude ou null si le format est invalide.
   */
  private parseCoordinates(
    source: string,
  ): { latitude: number; longitude: number } | null {
    const parts = source.split(',');
    if (parts.length === 2) {
      const lat = parseFloat(parts[0].trim());
      const lon = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lon)) {
        return { latitude: lat, longitude: lon };
      }
    }
    return null;
  }

  /**
   * Simule le calcul d'un itinéraire entre deux points en tenant compte des incidents confirmés.
   * Si la source est au format "latitude,longitude", seule la zone proche sera utilisée pour filtrer les incidents.
   * @param source Le point de départ (peut être une adresse ou des coordonnées au format "lat,lon").
   * @param destination Le point d'arrivée.
   * @param options Options supplémentaires (ex. éviter les péages).
   * @returns Un objet représentant l'itinéraire calculé.
   */
  async calculateRoute(
    source: string,
    destination: string,
    options?: { avoidTolls?: boolean },
  ): Promise<any> {
    const PROXIMITY_DELTA = 0.1; // Seuil de proximité en degrés pour le filtrage
    let incidents;

    const coordinates = this.parseCoordinates(source);
    if (coordinates) {
      // Si les coordonnées sont valides, récupérer uniquement les incidents à proximité
      incidents = await this.incidentService.findIncidentsNear(
        coordinates.latitude,
        coordinates.longitude,
        PROXIMITY_DELTA,
      );
    } else {
      // Sinon, récupérer tous les incidents
      incidents = await this.incidentService.getAllIncidents();
    }

    // Vérifie s'il existe au moins un incident confirmé dans la zone filtrée
    const hasConfirmedIncident = incidents.some(
      (incident) => incident.confirmed,
    );

    if (hasConfirmedIncident) {
      return {
        source,
        destination,
        distance: '12 km',
        duration: '20 minutes',
        instructions: [
          `Départ de ${source}`,
          "Itinéraire modifié en raison d'un incident confirmé sur la route",
          `Arrivée à ${destination}`,
        ],
        avoidTolls: options?.avoidTolls || false,
        recalculated: true,
      };
    } else {
      return {
        source,
        destination,
        distance: '10 km',
        duration: '15 minutes',
        instructions: [
          `Départ de ${source}`,
          'Suivre la route principale',
          `Arrivée à ${destination}`,
        ],
        avoidTolls: options?.avoidTolls || false,
        recalculated: false,
      };
    }
  }

  /**
   * Génère un QR code à partir de l’itinéraire calculé.
   * Le QR code contient les données de l’itinéraire au format JSON.
   * @param source Le point de départ.
   * @param destination Le point d'arrivée.
   * @param options Options supplémentaires (ex. éviter les péages).
   * @returns Une chaîne de caractères représentant le QR code en data URL.
   */
  async generateRouteQRCode(
    source: string,
    destination: string,
    options?: { avoidTolls?: boolean },
  ): Promise<string> {
    // Calcul de l'itinéraire
    const route = await this.calculateRoute(source, destination, options);
    // Sérialisation de l'itinéraire en JSON
    const routeData = JSON.stringify(route);
    try {
      // Génération du QR code en format Data URL
      const qrCodeDataUrl = await QRCode.toDataURL(routeData);
      return qrCodeDataUrl;
    } catch (error) {
      throw new Error('La génération du QR code a échoué');
    }
  }
}
