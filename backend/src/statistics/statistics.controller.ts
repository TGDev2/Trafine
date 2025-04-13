import { Controller, Get, UseGuards } from '@nestjs/common';
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
}
