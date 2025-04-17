import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import {
  RouteCalculationStrategy,
  RouteResult,
} from './route-calculation.strategy';

@Injectable()
export class OsrmRouteCalculationStrategy implements RouteCalculationStrategy {
  private readonly osrmBaseUrl: string;

  constructor() {
    // URL OSRM configurable (docker-compose → http://osrm:5000)
    this.osrmBaseUrl = process.env.OSRM_BASE_URL || 'http://localhost:5000';
  }

  private parseCoordinates(
    coordinateStr: string,
  ): { latitude: number; longitude: number } | null {
    const parts = coordinateStr.split(',');
    if (parts.length === 2) {
      const latitude = parseFloat(parts[0].trim());
      const longitude = parseFloat(parts[1].trim());
      if (!isNaN(latitude) && !isNaN(longitude)) {
        return { latitude, longitude };
      }
    }
    return null;
  }

  async calculateRoute(
    source: string,
    destination: string,
    options?: { avoidTolls?: boolean },
  ): Promise<{ routes: RouteResult[] }> {
    const sourceCoords = this.parseCoordinates(source);
    const destCoords = this.parseCoordinates(destination);
    if (!sourceCoords || !destCoords) {
      throw new Error(
        "Les coordonnées doivent être au format 'latitude, longitude'.",
      );
    }

    /* ----------------------------------------------------------------
     * Construction dynamique de la query :
     *  - alternatives : itinéraires multiples
     *  - geometries  : GeoJSON pour affichage
     *  - steps       : instructions de navigation
     *  - exclude=toll si l’utilisateur veut éviter les péages
     * ----------------------------------------------------------------*/
    const coordinates = `${sourceCoords.longitude},${sourceCoords.latitude};${destCoords.longitude},${destCoords.latitude}`;
    const urlParams = new URLSearchParams({
      alternatives: 'true',
      geometries: 'geojson',
      overview: 'full',
      steps: 'true',
    });
    if (options?.avoidTolls) {
      urlParams.append('exclude', 'toll');
    }
    const url = `${this.osrmBaseUrl}/route/v1/driving/${coordinates}?${urlParams.toString()}`;

    try {
      const response = await axios.get(url);
      if (response.data.code !== 'Ok') {
        throw new InternalServerErrorException(
          "OSRM ne parvient pas à calculer l'itinéraire.",
        );
      }

      const routes: RouteResult[] = response.data.routes.map((route: any) => {
        const distanceKm = route.distance / 1000;
        const durationMin = route.duration / 60;
        const instructions =
          route.legs?.[0]?.steps?.map(
            (step: any) => step.maneuver.instruction || '',
          ) ?? [];

        return {
          source,
          destination,
          distance: `${distanceKm.toFixed(2)} km`,
          duration: `${durationMin.toFixed(0)} minutes`,
          instructions,
          avoidTolls: options?.avoidTolls ?? false,
          recalculated: false,
          geometry: route.geometry,
        };
      });
      return { routes };
    } catch (error: any) {
      throw new InternalServerErrorException(
        "Erreur lors de l'appel à OSRM : " + error.message,
      );
    }
  }
}
