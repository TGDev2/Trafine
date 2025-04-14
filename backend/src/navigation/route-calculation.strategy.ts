import { Injectable } from '@nestjs/common';
import { IncidentService } from '../incident/incident.service';
import { Incident } from '../incident/incident.entity';

/**
 * Définition du type de résultat du calcul d’itinéraire.
 */
export interface RouteResult {
  source: string;
  destination: string;
  distance: string;
  duration: string;
  instructions: string[];
  avoidTolls: boolean;
  recalculated: boolean;
}

/**
 * Interface décrivant une stratégie de calcul d’itinéraire.
 */
export interface RouteCalculationStrategy {
  calculateRoute(
    source: string,
    destination: string,
    options?: { avoidTolls?: boolean },
  ): Promise<RouteResult>;
}

/**
 * Implémentation de base d’une stratégie de calcul d’itinéraire.
 */
@Injectable()
export class BasicRouteCalculationStrategy implements RouteCalculationStrategy {
  constructor(private readonly incidentService: IncidentService) {}

  /**
   * Parse une chaîne de caractères de type "latitude, longitude" et retourne un objet de coordonnées.
   * @param coordinateStr La chaîne de caractères contenant les coordonnées.
   */
  private parseCoordinates(
    coordinateStr: string,
  ): { latitude: number; longitude: number } | null {
    const parts = coordinateStr.split(',');
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
   * Vérifie si une paire de coordonnées se situe dans les limites de la France métropolitaine.
   * Pour simplifier, nous utilisons des bornes approximatives.
   * Latitude entre 41.0 et 51.5 et longitude entre -5.0 et 10.0.
   * @param latitude Latitude à vérifier.
   * @param longitude Longitude à vérifier.
   */
  private isWithinFrance(latitude: number, longitude: number): boolean {
    return (
      latitude >= 41.0 &&
      latitude <= 51.5 &&
      longitude >= -5.0 &&
      longitude <= 10.0
    );
  }

  async calculateRoute(
    source: string,
    destination: string,
    options?: { avoidTolls?: boolean },
  ): Promise<RouteResult> {
    // Parse des coordonnées de départ et d'arrivée
    const sourceCoords = this.parseCoordinates(source);
    const destCoords = this.parseCoordinates(destination);

    if (!sourceCoords || !destCoords) {
      throw new Error(
        "Les coordonnées de départ et d'arrivée doivent être fournies sous le format 'latitude, longitude'.",
      );
    }

    // Validation géographique : seules les coordonnées en France métropolitaine sont acceptées.
    if (
      !this.isWithinFrance(sourceCoords.latitude, sourceCoords.longitude) ||
      !this.isWithinFrance(destCoords.latitude, destCoords.longitude)
    ) {
      throw new Error(
        'Seuls les trajets en France métropolitaine sont supportés pour la bêta.',
      );
    }

    const PROXIMITY_DELTA = 0.1;
    // Utilise les coordonnées de départ pour la recherche des incidents à proximité
    const incidents = await this.incidentService.findIncidentsNear(
      sourceCoords.latitude,
      sourceCoords.longitude,
      PROXIMITY_DELTA,
    );

    const confirmedIncidents = incidents.filter(
      (incident) => incident.confirmed,
    );
    const confirmedCount = confirmedIncidents.length;

    const baseDistance = 10;
    const baseDuration = 15;
    const additionalDistance = confirmedCount * 2;
    const additionalDuration = confirmedCount * 3;

    let adjustedDistance = baseDistance + additionalDistance;
    let adjustedDuration = baseDuration + additionalDuration;
    let instructions: string[];

    if (options?.avoidTolls) {
      adjustedDistance = Math.round(adjustedDistance * 1.2);
      adjustedDuration = Math.round(adjustedDuration * 1.1);
      instructions = [
        `Départ de ${source}`,
        'Itinéraire optimisé pour éviter les péages',
        `Arrivée à ${destination}`,
      ];
    } else {
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
    }

    return {
      source,
      destination,
      distance: `${adjustedDistance} km`,
      duration: `${adjustedDuration} minutes`,
      instructions,
      avoidTolls: options?.avoidTolls || false,
      recalculated: confirmedCount > 0,
    };
  }
}
