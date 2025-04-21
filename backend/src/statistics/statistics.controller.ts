import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  /**
   * GET /statistics
   * Renvoie les statistiques de trafic.
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  getStatistics() {
    return this.statisticsService.getTrafficStatistics();
  }

  /**
   * GET /statistics/prediction?at=2025-04-22T18:00:00Z
   * - `at` (ISO 8601, UTC) facultatif : heure cible à prédire.
   *   • absent ⇒ prédiction pour la prochaine heure.
   */
  @UseGuards(JwtAuthGuard)
  @Get('prediction')
  getPrediction(@Query('at') at?: string) {
    const target = at ? new Date(at) : undefined;
    return this.statisticsService.getCongestionPrediction(target);
  }

  /**
   * GET /statistics/hourly?window=24
   * Nombre d’incidents par heure sur les `window` dernières heures (24 h par défaut).
   */
  @UseGuards(JwtAuthGuard)
  @Get('hourly')
  getHourly(
    @Query('window', new ParseIntPipe({ optional: true })) window?: number,
  ) {
    return this.statisticsService.getIncidentsByHour(window ?? 24);
  }
}
