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
   * Calcule un itinéraire entre deux points en tenant compte des incidents confirmés.
   * Le calcul de l'itinéraire est dynamique : il augmente la distance et la durée estimées
   * en fonction du nombre d'incidents confirmés à proximité du point de départ.
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

    // Calcul dynamique basé sur le nombre d'incidents confirmés
    const confirmedIncidents = incidents.filter(
      (incident) => incident.confirmed,
    );
    const confirmedCount = confirmedIncidents.length;

    const baseDistance = 10; // km de base
    const baseDuration = 15; // minutes de base

    const additionalDistance = confirmedCount * 2; // km ajoutés par incident confirmé
    const additionalDuration = confirmedCount * 3; // minutes ajoutées par incident confirmé

    const finalDistance = baseDistance + additionalDistance;
    const finalDuration = baseDuration + additionalDuration;

    // Construction des instructions
    let instructions;
    if (confirmedCount > 0) {
      instructions = [
        `Départ de ${source}`,
        `Trafic perturbé avec ${confirmedCount} incident(s) confirmé(s), itinéraire ajusté`,
        `Arrivée à ${destination}`,
      ];
    } else {
      instructions = [
        `Départ de ${source}`,
        'Suivre la route principale',
        `Arrivée à ${destination}`,
      ];
    }

    return {
      source,
      destination,
      distance: `${finalDistance} km`,
      duration: `${finalDuration} minutes`,
      instructions,
      avoidTolls: options?.avoidTolls || false,
      recalculated: confirmedCount > 0,
    };
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
