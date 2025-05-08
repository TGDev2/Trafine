import {
  RouteCalculationStrategy,
  RouteResult,
  RouteStep,
} from './route-calculation.strategy';
import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class OrsRouteCalculationStrategy implements RouteCalculationStrategy {
  private readonly baseUrl =
    process.env.ORS_BASE_URL || 'https://api.openrouteservice.org';
  private readonly apiKey = process.env.ORS_API_KEY ?? '';

  /** Seuil (km) au-delà duquel ORS refuse `alternative_routes` */
  private static readonly ALT_MAX_KM = 100;

  /* ---------------- Utils ---------------- */

  /** Haversine rapide (km) */
  private haversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /** Vérifie la position en France métro */
  private assertInFrance(lat: number, lon: number, label: string) {
    if (lat < 41 || lat > 51 || lon < -5 || lon > 9) {
      throw new BadRequestException(
        `${label} (${lat}, ${lon}) doit se situer en France métropolitaine.`,
      );
    }
  }

  private parseCoords(str: string) {
    const [latStr, lonStr] = str.split(',').map((s) => s.trim());
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (isFinite(lat) && isFinite(lon)) return { lat, lon };
    throw new Error(
      "Les coordonnées doivent être au format 'latitude, longitude'.",
    );
  }

  /* ---------------- Implémentation ---------------- */

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

    /* 1 / Parsing & validation */
    const s = this.parseCoords(source);
    const d = this.parseCoords(destination);
    this.assertInFrance(s.lat, s.lon, 'Point de départ');
    this.assertInFrance(d.lat, d.lon, 'Point d’arrivée');

    /* 2 / Construction de la requête ORS */
    const body: Record<string, any> = {
      coordinates: [
        [s.lon, s.lat],
        [d.lon, d.lat],
      ],
      instructions: true,
      geometry: true,
      preference: 'recommended',
      ...(opts?.avoidTolls ? { options: { avoid_features: ['tollways'] } } : {}),
    };

    /* Désactive `alternative_routes` si la distance dépasse ALT_MAX_KM */
    const distKm = this.haversine(s.lat, s.lon, d.lat, d.lon);
    if (distKm <= OrsRouteCalculationStrategy.ALT_MAX_KM) {
      body.alternative_routes = {
        target_count: 3,
        share_factor: 0.6,
        weight_factor: 1.6,
      };
    }

    /* 3 / Appel ORS */
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
      if (!features?.length) throw new Error('Réponse ORS invalide ou vide');

      /* 4 / Mapping GeoJSON → RouteResult[] */
      const routes: RouteResult[] = features.map((f: any, idx: number) => {
        const seg = f.properties.segments[0];
        const steps: RouteStep[] = seg.steps.map((st: any) => {
          const [wp] = st.way_points;
          const [lon, lat] = f.geometry.coordinates[wp];
          return {
            instruction: st.instruction,
            latitude: lat,
            longitude: lon,
            distance: st.distance,
            duration: st.duration,
          };
        });
        return {
          source,
          destination,
          distance: `${(seg.distance / 1000).toFixed(2)} km`,
          duration: `${Math.round(seg.duration / 60)} minutes`,
          instructions: seg.steps.map((s: any) => s.instruction),
          steps,
          avoidTolls: opts?.avoidTolls ?? false,
          recalculated: idx > 0,
          geometry: f.geometry,
        };
      });

      return { routes };
    } catch (err: any) {
      /* Normalisation du message d’erreur */
      const raw =
        err.response?.data?.error ??
        err.response?.data ??
        err.message ??
        err.toString();
      const message = typeof raw === 'string' ? raw : JSON.stringify(raw);
      throw new InternalServerErrorException(
        `OpenRouteService error: ${message}`,
      );
    }
  }
}
