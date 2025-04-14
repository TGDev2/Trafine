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
 * Implémentation améliorée d’une stratégie de calcul d’itinéraire.
 * Utilise la formule de Haversine pour calculer la distance de base
 * et applique une pénalité sur la distance et la durée pour chaque incident confirmé
 * situé à proximité de la trajectoire directe.
 */
@Injectable()
export class RouteCalculationStrategy
  implements RouteCalculationStrategy
{
  constructor(private readonly incidentService: IncidentService) {}

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
   * Calcule la distance en km entre deux points donnés en utilisant la formule de Haversine.
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371; // rayon de la Terre en km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calcule une distance approximative (en km) entre un point (lat, lon) et la ligne droite définie par deux points (lat1, lon1) et (lat2, lon2).
   * On effectue ici une approximation en considérant une conversion moyenne de 1° ≈ 111 km.
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
    const numerator = Math.abs(ABx * (A.y - P.y) - ABy * (A.x - P.x));
    const denominator = Math.sqrt(ABx ** 2 + ABy ** 2);
    // Conversion d'une différence en degrés en km (approximation)
    return (numerator / denominator) * 111;
  }

  async calculateRoute(
    source: string,
    destination: string,
    options?: { avoidTolls?: boolean },
  ): Promise<RouteResult> {
    // Extraction et validation des coordonnées
    const sourceCoords = this.parseCoordinates(source);
    const destCoords = this.parseCoordinates(destination);

    if (!sourceCoords || !destCoords) {
      throw new Error(
        "Les coordonnées de départ et d'arrivée doivent être fournies au format 'latitude, longitude'.",
      );
    }

    // Vérification géographique pour la France métropolitaine
    if (
      !this.isWithinFrance(sourceCoords.latitude, sourceCoords.longitude) ||
      !this.isWithinFrance(destCoords.latitude, destCoords.longitude)
    ) {
      throw new Error(
        'Seuls les trajets en France métropolitaine sont supportés pour la bêta.',
      );
    }

    // Calcul de la distance de base et estimation de la durée
    const baseDistance = this.haversineDistance(
      sourceCoords.latitude,
      sourceCoords.longitude,
      destCoords.latitude,
      destCoords.longitude,
    );
    // Hypothèse : vitesse moyenne d'environ 60 km/h (1 km/min)
    const baseDuration = baseDistance;

    // Récupération des incidents confirmés proches du point de départ
    const PROXIMITY_DELTA = 0.1;
    const incidents = await this.incidentService.findIncidentsNear(
      sourceCoords.latitude,
      sourceCoords.longitude,
      PROXIMITY_DELTA,
    );
    const confirmedIncidents = incidents.filter(
      (incident) => incident.confirmed,
    );

    // Comptage des incidents situés à proximité de la trajectoire directe
    let incidentsOnRoute = 0;
    const routeProximityThreshold = 5; // seuil en km
    for (const incident of confirmedIncidents) {
      const distanceToRoute = this.pointToLineDistance(
        incident.latitude,
        incident.longitude,
        sourceCoords.latitude,
        sourceCoords.longitude,
        destCoords.latitude,
        destCoords.longitude,
      );
      if (distanceToRoute <= routeProximityThreshold) {
        incidentsOnRoute++;
      }
    }

    // Application de pénalités en cas d'incidents proches
    const penaltyDistance = incidentsOnRoute * 1.5; // km supplémentaires par incident
    const penaltyDuration = incidentsOnRoute * 2; // minutes supplémentaires par incident

    let adjustedDistance = baseDistance + penaltyDistance;
    let adjustedDuration = baseDuration + penaltyDuration;
    let instructions: string[];
    const recalculated = incidentsOnRoute > 0;

    if (options?.avoidTolls) {
      adjustedDistance *= 1.15;
      adjustedDuration *= 1.1;
      instructions = [
        `Départ de ${source}`,
        'Itinéraire optimisé pour éviter les péages',
        `Arrivée à ${destination}`,
      ];
    } else {
      if (recalculated) {
        instructions = [
          `Départ de ${source}`,
          `Trafic perturbé avec ${incidentsOnRoute} incident(s) proche(s) de la route, itinéraire ajusté`,
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
      distance: `${adjustedDistance.toFixed(2)} km`,
      duration: `${adjustedDuration.toFixed(0)} minutes`,
      instructions,
      avoidTolls: options?.avoidTolls || false,
      recalculated,
    };
  }
}
