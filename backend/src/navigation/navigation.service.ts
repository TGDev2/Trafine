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
    const { routes } = await this.calculateRoute(source, destination, options);

    const sharePayload = {
      routes: routes.map(({ geometry, ...rest }) => rest),
    };

    const payloadStr = JSON.stringify(sharePayload);
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(payloadStr);
      return qrCodeDataUrl;
    } catch (error: any) {
      throw new Error(`La génération du QR code a échoué : ${error.message}`);
    }
  }
}
