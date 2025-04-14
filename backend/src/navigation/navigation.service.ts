import { Injectable, Inject } from '@nestjs/common';
import * as QRCode from 'qrcode';
import {
  RouteCalculationStrategy,
  RouteResult,
} from './route-calculation.strategy';

@Injectable()
export class NavigationService {
  constructor(
    @Inject('RouteCalculationStrategy')
    private readonly routeCalculationStrategy: RouteCalculationStrategy,
  ) {}

  /**
   * Renvoie les itinéraires proposés sous forme d’un tableau d’alternatives.
   */
  async calculateRoute(
    source: string,
    destination: string,
    options?: { avoidTolls?: boolean },
  ): Promise<{ routes: RouteResult[] }> {
    return await this.routeCalculationStrategy.calculateRoute(
      source,
      destination,
      options,
    );
  }

  /**
   * Génère un QR code représentant l’ensemble des itinéraires calculés.
   */
  async generateRouteQRCode(
    source: string,
    destination: string,
    options?: { avoidTolls?: boolean },
  ): Promise<string> {
    const routeData = await this.calculateRoute(source, destination, options);
    const routeDataStr = JSON.stringify(routeData);
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(routeDataStr);
      return qrCodeDataUrl;
    } catch (error) {
      throw new Error('La génération du QR code a échoué');
    }
  }
}
