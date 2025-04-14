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
   * Délègue le calcul d’itinéraire à la stratégie injectée.
   */
  async calculateRoute(
    source: string,
    destination: string,
    options?: { avoidTolls?: boolean },
  ): Promise<RouteResult> {
    return await this.routeCalculationStrategy.calculateRoute(
      source,
      destination,
      options,
    );
  }

  /**
   * Génère un QR code représentant l’itinéraire calculé.
   */
  async generateRouteQRCode(
    source: string,
    destination: string,
    options?: { avoidTolls?: boolean },
  ): Promise<string> {
    const route = await this.calculateRoute(source, destination, options);
    const routeData = JSON.stringify(route);
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(routeData);
      return qrCodeDataUrl;
    } catch (error) {
      throw new Error('La génération du QR code a échoué');
    }
  }
}
