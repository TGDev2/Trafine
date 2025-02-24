import { Controller, Post, Body } from '@nestjs/common';
import { NavigationService } from './navigation.service';

@Controller('navigation')
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  /**
   * Endpoint POST /navigation/calculate
   * Permet de calculer un itinéraire entre un point de départ et une destination.
   * Exemple de payload JSON :
   * {
   *   "source": "Paris",
   *   "destination": "Lyon",
   *   "avoidTolls": true
   * }
   */
  @Post('calculate')
  calculateRoute(
    @Body() body: { source: string; destination: string; avoidTolls?: boolean },
  ) {
    return this.navigationService.calculateRoute(
      body.source,
      body.destination,
      { avoidTolls: body.avoidTolls },
    );
  }
}
