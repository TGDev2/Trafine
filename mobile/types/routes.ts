export interface RouteStep {
    /** Phrase d’instruction (ex. "Tourner à gauche") */
    instruction: string;
    /** Latitude de l’étape */
    latitude: number;
    /** Longitude de l’étape */
    longitude: number;
    /** Distance de l’étape en mètres */
    distance: number;
    /** Durée estimée de l’étape en secondes */
    duration: number;
}

export interface RouteResult {
    /** Source, format "lat, lon" ou adresse */
    source: string;
    /** Destination, même format */
    destination: string;
    /** Distance totale, ex. "12.34 km" */
    distance: string;
    /** Durée totale, ex. "15 minutes" */
    duration: string;
    /** Instructions textuelles */
    instructions: string[];
    /** Étapes détaillées pour turn-by-turn */
    steps: RouteStep[];
    /** Indique si on a évité les péages */
    avoidTolls?: boolean;
    /** true si c’est une alternative recalculée */
    recalculated?: boolean;
    /** Géométrie GeoJSON si présente (utilisée pour le tracé sur carte) */
    geometry?: any;
}
