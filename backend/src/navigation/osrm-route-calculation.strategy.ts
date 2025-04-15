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
    // L'URL de base de l'API OSRM peut être configurée via l'environnement
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

    // Construction de l'URL pour OSRM (profil "driving", alternatives=true pour plusieurs trajets,
    // geometries=geojson pour récupérer la géométrie et steps=true pour obtenir des instructions)
    const coordinates = `${sourceCoords.longitude},${sourceCoords.latitude};${destCoords.longitude},${destCoords.latitude}`;
    const url = `${this.osrmBaseUrl}/route/v1/driving/${coordinates}?alternatives=true&geometries=geojson&overview=full&steps=true`;

    try {
      const response = await axios.get(url);
      if (response.data.code !== 'Ok') {
        throw new InternalServerErrorException(
          "OSRM ne parvient pas à calculer l'itinéraire.",
        );
      }
      const routes: RouteResult[] = response.data.routes.map((route: any) => {
        // Conversion de la distance (mètres) en km et durée (secondes) en minutes
        const distanceKm = route.distance / 1000;
        const durationMin = route.duration / 60;
        // Extraction des instructions à partir des étapes (du premier segment)
        let instructions: string[] = [];
        if (route.legs && route.legs.length > 0) {
          instructions = route.legs[0].steps.map(
            (step: any) => step.maneuver.instruction || '',
          );
        }
        return {
          source,
          destination,
          distance: `${distanceKm.toFixed(2)} km`,
          duration: `${durationMin.toFixed(0)} minutes`,
          instructions,
          avoidTolls: options?.avoidTolls || false,
          recalculated: false, // OSRM renvoie directement le trajet optimisé
          geometry: route.geometry, // Géométrie de l'itinéraire au format GeoJSON
        };
      });
      return { routes };
    } catch (error: any) {
      throw new InternalServerErrorException(
        "Erreur lors de l'appel à OSRM: " + error.message,
      );
    }
  }
}
