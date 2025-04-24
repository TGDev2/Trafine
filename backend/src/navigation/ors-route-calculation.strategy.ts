import {
  RouteCalculationStrategy,
  RouteResult,
} from './route-calculation.strategy';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

interface OrsStep {
  instruction: string;
}
interface OrsSegment {
  steps: OrsStep[];
  distance: number; // m
  duration: number; // s
}

@Injectable()
export class OrsRouteCalculationStrategy implements RouteCalculationStrategy {
  /** Base URL d’ORS (configurable). */
  private readonly baseUrl =
    process.env.ORS_BASE_URL || 'https://api.openrouteservice.org';

  /** Clé API ORS (obligatoire). */
  private readonly apiKey = process.env.ORS_API_KEY ?? '';

  private parseCoords(str: string) {
    const [lat, lon] = str.split(',').map((s) => parseFloat(s.trim()));
    if (isFinite(lat) && isFinite(lon)) return { lat, lon };
    throw new Error(
      "Les coordonnées doivent être au format 'latitude, longitude'.",
    );
  }

  /** ------------------------------------------------------------------
   *  Calcul d’itinéraire avec alternatives (OpenRouteService)
   * -----------------------------------------------------------------*/
  async calculateRoute(
    source: string,
    destination: string,
    opts?: { avoidTolls?: boolean },
  ): Promise<{ routes: RouteResult[] }> {
    if (!this.apiKey) {
      throw new Error(
        'ORS_API_KEY manquante. Obtenez une clé gratuite sur https://openrouteservice.org',
      );
    }

    const s = this.parseCoords(source);
    const d = this.parseCoords(destination);

    const body = {
      coordinates: [
        [s.lon, s.lat],
        [d.lon, d.lat],
      ],
      instructions: true,
      geometry: true,
      preference: 'recommended',
      // ➕ itinéraires alternatifs (jusqu’à 3)
      alternative_routes: {
        target_count: 3,
        share_factor: 0.6,
        weight_factor: 1.6,
      },
      ...(opts?.avoidTolls
        ? { options: { avoid_features: ['tollways'] } }
        : {}),
    };

    try {
      const { data } = await axios.post(
        `${this.baseUrl}/v2/directions/driving-car/geojson`,
        body,
        {
          headers: {
            Authorization: this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      const features = data.features as any[];
      if (!features?.length) {
        throw new Error('Réponse ORS invalide ou vide');
      }

      // Chaque feature représente une alternative
      const routes: RouteResult[] = features.map((f, idx) => {
        const seg: OrsSegment = f.properties.segments[0];
        return {
          source,
          destination,
          distance: `${(seg.distance / 1000).toFixed(2)} km`,
          duration: `${Math.round(seg.duration / 60)} minutes`,
          instructions: seg.steps.map((s) => s.instruction),
          avoidTolls: opts?.avoidTolls ?? false,
          recalculated: idx > 0, // la première est l’optimale
          geometry: f.geometry, // GeoJSON LineString
        };
      });

      return { routes };
    } catch (err: any) {
      throw new InternalServerErrorException(
        `OpenRouteService error : ${err.response?.data?.error || err.message}`,
      );
    }
  }
}
