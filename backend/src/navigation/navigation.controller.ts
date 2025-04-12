import { Controller, Post, Body } from '@nestjs/common';
import { NavigationService } from './navigation.service';

@Controller('navigation')
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  /**
   * Endpoint POST /navigation/calculate
   * Permet de calculer un itinéraire entre un point de départ et une destination en tenant compte des incidents.
   */
  @Post('calculate')
  async calculateRoute(
    @Body() body: { source: string; destination: string; avoidTolls?: boolean },
  ) {
    return await this.navigationService.calculateRoute(
      body.source,
      body.destination,
      { avoidTolls: body.avoidTolls },
    );
  }

  /**
   * Endpoint POST /navigation/share
   * Permet de générer un QR code pour partager un itinéraire calculé.
   * Le QR code contient les données de l'itinéraire au format JSON.
   */
  @Post('share')
  async shareRoute(
    @Body() body: { source: string; destination: string; avoidTolls?: boolean },
  ) {
    const qrCodeData = await this.navigationService.generateRouteQRCode(
      body.source,
      body.destination,
      { avoidTolls: body.avoidTolls },
    );
    return { qrCode: qrCodeData };
  }
}
