import { Controller, Post, Body } from '@nestjs/common';
import { NavigationService } from './navigation.service';

@Controller('navigation')
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  /**
   * Endpoint POST /navigation/calculate
   * Renvoie un ensemble d’itinéraires alternatifs.
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
   * Génère et renvoie un QR code représentant les itinéraires proposés.
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
