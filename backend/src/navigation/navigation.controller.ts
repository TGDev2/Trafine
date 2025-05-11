import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
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
    private readonly nav: NavigationService,
    private readonly alerts: AlertsGateway,
  ) { }

  /* ------ Calcul simple ------ */
  @Post('calculate')
  calculate(@Body() b: CalcBody) {
    return this.nav.calculateRoute(b.source, b.destination, {
      avoidTolls: b.avoidTolls,
    });
  }

  /* ------ Génération du QR code ------ */
  @Post('share')
  async share(@Body() b: CalcBody) {
    const { routes } = await this.nav.calculateRoute(b.source, b.destination, {
      avoidTolls: b.avoidTolls,
    });
    return this.nav.generateRouteQRCode(routes);
  }

  /* ------ Lecture du partage ------ */
  @Get('share/:id')
  async getShare(@Param('id', ParseUUIDPipe) id: string) {
    const routes = await this.nav.getSharedRoute(id);
    return { routes };
  }

  /* ------ Push direct vers mobile ------ */
  @UseGuards(JwtAuthGuard)
  @Post('push')
  async push(@Body() b: CalcBody, @Req() req: AuthenticatedRequest) {
    const { routes } = await this.nav.calculateRoute(b.source, b.destination, {
      avoidTolls: b.avoidTolls,
    });
    this.alerts.sendRouteToUser(req.user.userId, routes);
    return { ok: true, alternatives: routes.length };
  }
}
