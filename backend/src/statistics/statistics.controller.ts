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
  async getStatistics() {
    return await this.statisticsService.getTrafficStatistics();
  }

  /**
   * GET /statistics/prediction
   * Renvoie la prédiction du niveau de congestion basé sur les incidents récents.
   */
  @UseGuards(JwtAuthGuard)
  @Get('prediction')
  async getPrediction() {
    return await this.statisticsService.getCongestionPrediction();
  }

  /**
   * GET /statistics/hourly?window=24
   * Nombre d’incidents par heure sur les `window` dernières heures (24 h par défaut).
   */
  @UseGuards(JwtAuthGuard)
  @Get('hourly')
  async getHourly(
    @Query('window', new ParseIntPipe({ optional: true })) window?: number,
  ) {
    return this.statisticsService.getIncidentsByHour(window ?? 24);
  }
}
