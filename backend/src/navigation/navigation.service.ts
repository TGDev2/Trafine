import { Injectable } from '@nestjs/common';

@Injectable()
export class NavigationService {
  /**
   * Simule le calcul d'un itinéraire entre deux points.
   * @param source Le point de départ.
   * @param destination Le point d'arrivée.
   * @param options Options supplémentaires (ex. éviter les péages).
   * @returns Un objet représentant l'itinéraire calculé.
   */
  calculateRoute(
    source: string,
    destination: string,
    options?: { avoidTolls?: boolean },
  ): any {
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
    };
  }
}
