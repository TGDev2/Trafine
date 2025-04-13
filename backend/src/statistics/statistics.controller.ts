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
}
