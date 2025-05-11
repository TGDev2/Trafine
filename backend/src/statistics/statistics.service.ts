import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Incident } from '../incident/incident.entity';
import { MLPredictionService } from './ml-prediction.service';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Incident)
    private incidentRepository: Repository<Incident>,
    private readonly mlPredictionService: MLPredictionService,
  ) { }

  /* ------------------------------------------------------------------
   *  Statistiques globales
   * -----------------------------------------------------------------*/
  async getTrafficStatistics() {
    const totalIncidents = await this.incidentRepository.count();
    const confirmedIncidents = await this.incidentRepository.count({
      where: { confirmed: true },
    });
    const deniedIncidents = await this.incidentRepository.count({
      where: { denied: true },
    });

    const incidentsByTypeRaw = await this.incidentRepository
      .createQueryBuilder('incident')
      .select('incident.type', 'type')
      .addSelect('COUNT(incident.id)', 'count')
      .groupBy('incident.type')
      .getRawMany();

    const incidentsByType = incidentsByTypeRaw.reduce(
      (acc, curr) => ({ ...acc, [curr.type]: Number(curr.count) }),
      {} as Record<string, number>,
    );

    return {
      totalIncidents,
      confirmedIncidents,
      deniedIncidents,
      incidentsByType,
    };
  }

  /* ------------------------------------------------------------------
   *  Prédiction de congestion
   * -----------------------------------------------------------------*/
  async getCongestionPrediction(
    at: Date = new Date(Date.now() + 60 * 60 * 1000),
  ) {
    return this.mlPredictionService.getPrediction(at);
  }

  /* ------------------------------------------------------------------
   *  Incidents par heure
   * -----------------------------------------------------------------*/
  async getIncidentsByHour(windowHours = 24) {
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const raw = await this.incidentRepository
      .createQueryBuilder('incident')
      .select(
        "to_char(date_trunc('hour', incident.\"createdAt\"), 'HH24:00')",
        'hour',
      )
      .addSelect('COUNT(incident.id)', 'count')
      .where('incident."createdAt" >= :since', { since })
      .groupBy('date_trunc(\'hour\', incident."createdAt")')
      .orderBy('date_trunc(\'hour\', incident."createdAt")')
      .getRawMany();

    return raw.map((r) => ({ hour: r.hour, count: Number(r.count) }));
  }
}
