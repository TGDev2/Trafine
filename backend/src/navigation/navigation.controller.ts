import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { NavigationService } from './navigation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AlertsGateway } from '../alerts/alerts.gateway';

interface CalcBody {
  source: string;
  destination: string;
  avoidTolls?: boolean;
}

interface AuthenticatedRequest extends Request {
  user: { userId: number };
}

@Controller('navigation')
export class NavigationController {
  constructor(
    private readonly navigationService: NavigationService,
    private readonly alertsGateway: AlertsGateway,
  ) {}

  /* ------------------ Calcul d’itinéraire ------------------ */
  @Post('calculate')
  async calculateRoute(@Body() body: CalcBody) {
    return this.navigationService.calculateRoute(
      body.source,
      body.destination,
      { avoidTolls: body.avoidTolls },
    );
  }

  /* ------------------ Partage via QR Code ------------------ */
  @Post('share')
  async shareRoute(
    @Body() routeDto: CalcBody,
  ): Promise<{ qrDataUrl: string; shareId: string }> {
    // Le service renvoie déjà qrDataUrl et shareId (pas de requête SQL supplémentaire)
    return this.navigationService.generateRouteQRCode(routeDto);
  }

  /* ----------------------------------------------------------
   *  Push direct vers l’app mobile (JWT)
   * ---------------------------------------------------------*/
  @UseGuards(JwtAuthGuard)
  @Post('push')
  async pushRoute(@Body() body: CalcBody, @Req() req: AuthenticatedRequest) {
    const { routes } = await this.navigationService.calculateRoute(
      body.source,
      body.destination,
      { avoidTolls: body.avoidTolls },
    );
    this.alertsGateway.sendRouteToUser(req.user.userId, routes);
    return { ok: true, pushed: true, alternatives: routes.length };
  }
}
