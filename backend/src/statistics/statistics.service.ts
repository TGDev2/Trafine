import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Incident } from '../incident/incident.entity';
import { Repository, MoreThan } from 'typeorm';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Incident)
    private incidentRepository: Repository<Incident>,
  ) {}

  /**
   * Agrège les statistiques de trafic à partir des incidents enregistrés.
   * @returns Un objet contenant le nombre total d’incidents, le nombre d’incidents confirmés,
   * le nombre d’incidents infirmés et la répartition par type d’incident.
   */
  async getTrafficStatistics(): Promise<{
    totalIncidents: number;
    confirmedIncidents: number;
    deniedIncidents: number;
    incidentsByType: Record<string, number>;
  }> {
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
      (acc, curr) => {
        acc[curr.type] = Number(curr.count);
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalIncidents,
      confirmedIncidents,
      deniedIncidents,
      incidentsByType,
    };
  }

  /**
   * Prédit le niveau de congestion en se basant sur les incidents des dernières 60 minutes.
   * @returns Un objet contenant le niveau de congestion et le nombre d’incidents récents.
   */
  async getCongestionPrediction(): Promise<{
    congestionLevel: string;
    incidentCount: number;
  }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentIncidentCount = await this.incidentRepository.count({
      where: {
        createdAt: MoreThan(oneHourAgo),
      },
    });

    let congestionLevel = 'low';
    if (recentIncidentCount > 10) {
      congestionLevel = 'high';
    } else if (recentIncidentCount > 5) {
      congestionLevel = 'moderate';
    }

    return { congestionLevel, incidentCount: recentIncidentCount };
  }
}
