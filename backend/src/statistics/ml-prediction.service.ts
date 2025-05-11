import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Incident } from '../incident/incident.entity';
import { Repository, MoreThanOrEqual } from 'typeorm';

@Injectable()
export class MLPredictionService {
  constructor(
    @InjectRepository(Incident)
    private incidentRepository: Repository<Incident>,
  ) { }

  /* ------------------------------------------------------------------
   *  Données historiques
   * -----------------------------------------------------------------*/
  private async getHistoricalData(hours = 168) {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.incidentRepository.find({
      where: { createdAt: MoreThanOrEqual(startDate) },
      order: { createdAt: 'ASC' },
    });
  }

  /* ------------------------------------------------------------------
   *  Feature engineering
   * -----------------------------------------------------------------*/
  private calculateFeatures(incidents: Incident[]) {
    const hourlyCount = new Array(24).fill(0);
    const dayOfWeekCount = new Array(7).fill(0);
    const typeCount: Record<string, number> = {};

    incidents.forEach((incident) => {
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
    total: number;
  }) {
    const hourlyAvg =
      features.hourlyCount.reduce((a, b) => a + b, 0) /
      features.hourlyCount.length;
    const dailyAvg =
      features.dayOfWeekCount.reduce((a, b) => a + b, 0) /
      features.dayOfWeekCount.length;

    return {
      hourlyVariance: Math.sqrt(
        features.hourlyCount
          .map((c) => (c - hourlyAvg) ** 2)
          .reduce((a, b) => a + b, 0) / features.hourlyCount.length,
      ),
      dailyVariance: Math.sqrt(
        features.dayOfWeekCount
          .map((c) => (c - dailyAvg) ** 2)
          .reduce((a, b) => a + b, 0) / features.dayOfWeekCount.length,
      ),
    };
  }

  /* ------------------------------------------------------------------
   *  Prédiction « naïve » avec pondération heuristique
   * -----------------------------------------------------------------*/
  async getPrediction(
    targetDate: Date = new Date(Date.now() + 60 * 60 * 1000),
    hoursAnalysed = 168, // 7 jours par défaut
  ) {
    const historicalData = await this.getHistoricalData(hoursAnalysed);
    const features = this.calculateFeatures(historicalData);
    const trends = this.calculateTrends(features);

    /* Pondération empirique */
    const hourWeight = 0.4;
    const dayWeight = 0.3;
    const trendWeight = 0.3;

    const hourlyScore =
      features.hourlyCount[targetDate.getHours()] /
      Math.max(...features.hourlyCount, 1);
    const dayScore =
      features.dayOfWeekCount[targetDate.getDay()] /
      Math.max(...features.dayOfWeekCount, 1);
    const trendScore = (trends.hourlyVariance + trends.dailyVariance) / 2;

    const weightedScore =
      hourlyScore * hourWeight +
      dayScore * dayWeight +
      trendScore * trendWeight;

    const estimatedIncidents = Math.max(
      0,
      Math.round((features.total / hoursAnalysed) * (1 + weightedScore)),
    );

    return {
      timestamp: targetDate.toISOString(),
      congestionLevel: this.getCongestLevel(weightedScore),
      incidentCount: estimatedIncidents,
      confidence: Math.round(weightedScore * 100),
      hoursAnalysed,
      daysAnalysed: hoursAnalysed / 24,
      /*  Historique détaillé  */
      historicalMetrics: {
        totalIncidents: features.total,
        hourlyDistribution: features.hourlyCount,
        dailyDistribution: features.dayOfWeekCount,
        typeDistribution: features.typeCount,
      },
    };
  }

  /* ------------------------------------------------------------------
   *  Mapping score → libellé
   * -----------------------------------------------------------------*/
  private getCongestLevel(score: number): 'low' | 'moderate' | 'high' {
    if (score < 0.4) return 'low';
    if (score < 0.7) return 'moderate';
    return 'high';
  }
}
