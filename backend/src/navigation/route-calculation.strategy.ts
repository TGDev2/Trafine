import { Injectable } from '@nestjs/common';
import { IncidentService } from '../incident/incident.service';
import { Incident } from '../incident/incident.entity';

/**
 * Étape pour la navigation pas-à-pas.
 */
export interface RouteStep {
  /** Phrase d’instruction au format humain (ex. « Tourner à gauche »). */
  instruction: string;
  /** Latitude de l’étape. */
  latitude: number;
  /** Longitude de l’étape. */
  longitude: number;
  /** Distance de l’étape en mètres. */
  distance: number;
  /** Durée estimée de l’étape en secondes. */
  duration: number;
}

/**
 * Résultat d’un calcul d’itinéraire.
 */
export interface RouteResult {
  source: string;
  destination: string;
  distance: string;
  duration: string;
  /** Instructions textuelles (compatibilité ascendante) */
  instructions: string[];
  /** Étapes géolocalisées pour turn-by-turn */
  steps: RouteStep[];
  avoidTolls: boolean;
  recalculated: boolean;
  geometry?: any;
}

/**
 * Interface générique de stratégie de calcul d’itinéraire.
 */
export interface RouteCalculationStrategy {
  calculateRoute(
    source: string,
    destination: string,
    options?: { avoidTolls?: boolean },
  ): Promise<{ routes: RouteResult[] }>;
}

/**
 * Implémentation de secours (Haversine + pénalités incidents).
 */
@Injectable()
export class RouteCalculationStrategyImpl implements RouteCalculationStrategy {
  constructor(private readonly incidentService: IncidentService) { }

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

  private isWithinFrance(latitude: number, longitude: number): boolean {
    return (
      latitude >= 41.0 &&
      latitude <= 51.5 &&
      longitude >= -5.0 &&
      longitude <= 10.0
    );
  }

  /**
   * Formule de Haversine pour la distance en km.
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371; // rayon Terre en km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Distance point-ligne simplifiée (en km).
   */
  private pointToLineDistance(
    lat: number,
    lon: number,
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const A = { x: lon1, y: lat1 };
    const B = { x: lon2, y: lat2 };
    const P = { x: lon, y: lat };
    const ABx = B.x - A.x;
    const ABy = B.y - A.y;
    const num = Math.abs(ABx * (A.y - P.y) - ABy * (A.x - P.x));
    const den = Math.sqrt(ABx ** 2 + ABy ** 2);
    return (num / den) * 111; // approx km
  }

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
    if (
      !this.isWithinFrance(src.latitude, src.longitude) ||
      !this.isWithinFrance(dst.latitude, dst.longitude)
    ) {
      throw new Error(
        'Seuls les trajets en France métropolitaine sont supportés pour la bêta.',
      );
    }

    // Distance et durée de base
    const baseDistance = this.haversineDistance(
      src.latitude,
      src.longitude,
      dst.latitude,
      dst.longitude,
    );
    const baseDuration = baseDistance; // 1 km/minute

    // Incidents confirmés proches
    const PROX_DELTA = 0.1;
    const incidents = await this.incidentService.findIncidentsNear(
      src.latitude,
      src.longitude,
      PROX_DELTA,
    );
    const confirmed = incidents.filter((i) => i.confirmed);

    // Comptage des incidents sur la ligne
    let incidentsOnRoute = 0;
    const proximityKm = 5;
    for (const inc of confirmed) {
      const d = this.pointToLineDistance(
        inc.latitude,
        inc.longitude,
        src.latitude,
        src.longitude,
        dst.latitude,
        dst.longitude,
      );
      if (d <= proximityKm) incidentsOnRoute++;
    }

    // Première option : pénalité forte
    const penaltyDist = incidentsOnRoute * 1.5;
    const penaltyDur = incidentsOnRoute * 2;
    let dist1 = baseDistance + penaltyDist;
    let dur1 = baseDuration + penaltyDur;
    let instr1: string[];
    const rec1 = incidentsOnRoute > 0;
    if (options?.avoidTolls) {
      dist1 *= 1.15;
      dur1 *= 1.1;
      instr1 = [
        `Départ de ${source}`,
        'Itinéraire évitant les péages',
        `Arrivée à ${destination}`,
      ];
    } else {
      instr1 = rec1
        ? [
          `Départ de ${source}`,
          `${incidentsOnRoute} incident(s) proche(s), itinéraire ajusté`,
          `Arrivée à ${destination}`,
        ]
        : [
          `Départ de ${source}`,
          'Suivre route principale',
          `Arrivée à ${destination}`,
        ];
    }

    // Construction minimaliste des étapes
    const steps1: RouteStep[] = [
      {
        instruction: instr1[0],
        latitude: src.latitude,
        longitude: src.longitude,
        distance: 0,
        duration: 0,
      },
      {
        instruction: instr1[instr1.length - 1],
        latitude: dst.latitude,
        longitude: dst.longitude,
        distance: dist1 * 1000,
        duration: dur1 * 60,
      },
    ];

    const route1: RouteResult = {
      source,
      destination,
      distance: `${dist1.toFixed(2)} km`,
      duration: `${dur1.toFixed(0)} minutes`,
      instructions: instr1,
      steps: steps1,
      avoidTolls: options?.avoidTolls || false,
      recalculated: rec1,
    };

    // Seconde option : pénalité réduite
    const penaltyDist2 = incidentsOnRoute * 0.75;
    const penaltyDur2 = incidentsOnRoute * 1;
    let dist2 = baseDistance + penaltyDist2;
    let dur2 = baseDuration + penaltyDur2;
    let instr2: string[];
    const rec2 = incidentsOnRoute > 0;
    if (options?.avoidTolls) {
      dist2 *= 1.15;
      dur2 *= 1.1;
      instr2 = [
        `Départ de ${source}`,
        'Alternative évitant péages',
        `Arrivée à ${destination}`,
      ];
    } else {
      instr2 = rec2
        ? [
          `Départ de ${source}`,
          'Alternative évitant zones à incidents',
          `Arrivée à ${destination}`,
        ]
        : [
          `Départ de ${source}`,
          'Suivre route principale',
          `Arrivée à ${destination}`,
        ];
    }

    const steps2: RouteStep[] = steps1.map((st) => ({ ...st }));
    const route2: RouteResult = {
      source,
      destination,
      distance: `${dist2.toFixed(2)} km`,
      duration: `${dur2.toFixed(0)} minutes`,
      instructions: instr2,
      steps: steps2,
      avoidTolls: options?.avoidTolls || false,
      recalculated: rec2,
    };

    return { routes: [route1, route2] };
  }
}
