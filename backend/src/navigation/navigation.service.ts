import { Injectable } from '@nestjs/common';
import { IncidentService } from '../incident/incident.service';

@Injectable()
export class NavigationService {
  constructor(private readonly incidentService: IncidentService) {}

  /**
   * Simule le calcul d'un itinéraire entre deux points en tenant compte des incidents confirmés.
   * @param source Le point de départ.
   * @param destination Le point d'arrivée.
   * @param options Options supplémentaires (ex. éviter les péages).
   * @returns Un objet représentant l'itinéraire calculé.
   */
  async calculateRoute(
    source: string,
    destination: string,
    options?: { avoidTolls?: boolean },
  ): Promise<any> {
    // Récupère tous les incidents signalés.
    const incidents = await this.incidentService.getAllIncidents();
    // Vérifie s'il existe au moins un incident confirmé.
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
}
