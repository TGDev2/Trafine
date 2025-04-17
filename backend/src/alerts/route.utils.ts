import { pointToLineDistance } from '@turf/turf';
import type { Feature, LineString, Point } from 'geojson';
import { Incident } from '../incident/incident.entity';

/**
 * Vérifie si l'incident est à moins de `thresholdMeters` mètres
 * de la route GeoJSON fournie (Feature<LineString>).
 */
export function isIncidentNearRoute(
  route: Feature<LineString>,
  incident: Incident,
  thresholdMeters = 500,
): boolean {
  // Construire le point GeoJSON à partir des coords de l'incident
  const pt: Feature<Point> = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: [incident.longitude, incident.latitude],
    },
  };
  // Calculer la distance (en mètres) du point à la ligne
  const distance = pointToLineDistance(pt, route, { units: 'meters' });
  return distance <= thresholdMeters;
}
