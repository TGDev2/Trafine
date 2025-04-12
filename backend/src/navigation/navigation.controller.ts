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
}
