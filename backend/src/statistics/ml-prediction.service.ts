import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Incident } from '../incident/incident.entity';
import { Repository, MoreThanOrEqual } from 'typeorm';

@Injectable()
export class MLPredictionService {
  constructor(
    @InjectRepository(Incident)
    private incidentRepository: Repository<Incident>,
  ) {}

  private async getHistoricalData(hours: number = 168) {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.incidentRepository.find({
      where: { createdAt: MoreThanOrEqual(startDate) },
      order: { createdAt: 'ASC' },
    });
  }

  private calculateFeatures(incidents: Incident[]) {
    const hourlyCount = new Array(24).fill(0);
    const dayOfWeekCount = new Array(7).fill(0);
    const typeCount: Record<string, number> = {};

    incidents.forEach(incident => {
      const date = new Date(incident.createdAt);
      hourlyCount[date.getHours()]++;
      dayOfWeekCount[date.getDay()]++;
      typeCount[incident.type] = (typeCount[incident.type] || 0) + 1;
    });

    return {
      hourlyCount,
      dayOfWeekCount,
      typeCount,
      total: incidents.length,
    };
  }

  private calculateTrends(features: {
    hourlyCount: number[];
    dayOfWeekCount: number[];
    typeCount: Record<string, number>;
    total: number;
  }) {
    const hourlyAvg = features.hourlyCount.reduce((a: number, b: number) => a + b, 0) / 24;
    const dailyAvg = features.dayOfWeekCount.reduce((a: number, b: number) => a + b, 0) / 7;

    return {
      hourlyVariance: Math.sqrt(
        features.hourlyCount
          .map((count: number) => Math.pow(count - hourlyAvg, 2))
          .reduce((a: number, b: number) => a + b, 0) / 24
      ),
      dailyVariance: Math.sqrt(
        features.dayOfWeekCount
          .map((count: number) => Math.pow(count - dailyAvg, 2))
          .reduce((a: number, b: number) => a + b, 0) / 7
      ),
    };
  }

  async getPrediction(targetDate: Date = new Date(Date.now() + 60 * 60 * 1000)) {
    const historicalData = await this.getHistoricalData();
    const features = this.calculateFeatures(historicalData);
    const trends = this.calculateTrends(features);

    // Facteurs de pondération pour le modèle
    const hourWeight = 0.4;
    const dayWeight = 0.3;
    const trendWeight = 0.3;

    // Calcul du score de congestion prévu
    const hourlyScore = features.hourlyCount[targetDate.getHours()] / Math.max(...features.hourlyCount);
    const dayScore = features.dayOfWeekCount[targetDate.getDay()] / Math.max(...features.dayOfWeekCount);
    const trendScore = (trends.hourlyVariance + trends.dailyVariance) / 2;

    const weightedScore =
      hourlyScore * hourWeight +
      dayScore * dayWeight +
      trendScore * trendWeight;

    // Estimation du nombre d'incidents
    const estimatedIncidents = Math.round(
      (features.total / 168) * // moyenne horaire de base
      (1 + weightedScore) // facteur de multiplication basé sur le score
    );

    return {
      timestamp: targetDate.toISOString(),
      congestionLevel: this.getCongestLevel(weightedScore),
      incidentCount: Math.max(0, estimatedIncidents),
      confidence: Math.round(weightedScore * 100),
      historicalMetrics: {
        totalIncidents: features.total,
        hourlyDistribution: features.hourlyCount,
        dailyDistribution: features.dayOfWeekCount,
        typeDistribution: features.typeCount,
      },
    };
  }

  private getCongestLevel(score: number): 'low' | 'moderate' | 'high' {
    if (score < 0.4) return 'low';
    if (score < 0.7) return 'moderate';
    return 'high';
  }
}