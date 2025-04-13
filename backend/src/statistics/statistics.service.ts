import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Incident } from '../incident/incident.entity';
import { Repository } from 'typeorm';

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
}
