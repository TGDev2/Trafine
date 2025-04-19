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
    // URL OSRM configurable (docker‑compose → http://osrm:5000)
    this.osrmBaseUrl = process.env.OSRM_BASE_URL || 'http://localhost:5000';
  }

  /** -------------------------------------------------------------------
   *  Utils
   *  ------------------------------------------------------------------*/
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

  /**
   * Aligne un point sur le segment routier carrossable le plus proche.
   * Si l’endpoint /nearest répond correctement, on renvoie le point corrigé.
   * En cas d’erreur, on renvoie le point d’origine pour ne pas bloquer l’itinéraire.
   */
  private async snapToRoad(
    latitude: number,
    longitude: number,
  ): Promise<{ latitude: number; longitude: number }> {
    const url = `${this.osrmBaseUrl}/nearest/v1/driving/${longitude},${latitude}?number=1`;
    try {
      const { data } = await axios.get(url);
      if (data.code === 'Ok' && data.waypoints?.length) {
        const [snappedLon, snappedLat] = data.waypoints[0].location;
        return { latitude: snappedLat, longitude: snappedLon };
      }
    } catch {
    }
    return { latitude, longitude };
  }

  /** -------------------------------------------------------------------
   *  Méthode principale
   *  ------------------------------------------------------------------*/
  async calculateRoute(
    source: string,
    destination: string,
    options?: { avoidTolls?: boolean },
  ): Promise<{ routes: RouteResult[] }> {
    const src = this.parseCoordinates(source);
    const dst = this.parseCoordinates(destination);

    if (!src || !dst) {
      throw new Error(
        "Les coordonnées doivent être au format 'latitude, longitude'.",
      );
    }

    // Snap sur le réseau routier (améliore la précision & évite les détours)
    const sourceSnapped = await this.snapToRoad(src.latitude, src.longitude);
    const destSnapped = await this.snapToRoad(dst.latitude, dst.longitude);

    const coordinates = `${sourceSnapped.longitude},${sourceSnapped.latitude};${destSnapped.longitude},${destSnapped.latitude}`;

    /* ------------------------------------------------------------- */
    /*  Construction des paramètres de requête                       */
    /* ------------------------------------------------------------- */
    const urlParams = new URLSearchParams({
      alternatives: 'true',
      geometries: 'geojson',
      overview: 'full',
      steps: 'true',
    });
    if (options?.avoidTolls) urlParams.append('exclude', 'toll');

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
          source: `${sourceSnapped.latitude}, ${sourceSnapped.longitude}`,
          destination: `${destSnapped.latitude}, ${destSnapped.longitude}`,
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
