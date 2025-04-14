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

  async calculateRoute(
    source: string,
    destination: string,
    options?: { avoidTolls?: boolean },
  ): Promise<RouteResult> {
    const PROXIMITY_DELTA = 0.1;
    let incidents: Incident[];

    const coordinates = this.parseCoordinates(source);
    if (coordinates) {
      incidents = await this.incidentService.findIncidentsNear(
        coordinates.latitude,
        coordinates.longitude,
        PROXIMITY_DELTA,
      );
    } else {
      incidents = await this.incidentService.getAllIncidents();
    }

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

    let instructions: string[];
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
}
