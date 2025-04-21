import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Incident } from '../incident/incident.entity';
import { Repository, MoreThan } from 'typeorm';

const LOW_THRESHOLD = 5;
const MODERATE_THRESHOLD = 10;

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Incident)
    private incidentRepository: Repository<Incident>,
  ) {}

  /* ------------------------------------------------------------------
   *  Statistiques brutes
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
   *  Prédiction historisée
   *  -----------------------------------------------------------------
   *  - `at` : date/heure pour laquelle on veut la prédiction
   *    (par défaut : +1 h — anticipation « prochaine heure »)
   *  - Algorithme : moyenne glissante sur l’ensemble de l’historique
   *    pour (jour‑semaine × heure)
   * -----------------------------------------------------------------*/
  async getCongestionPrediction(
    at: Date = new Date(Date.now() + 60 * 60 * 1000),
  ): Promise<{
    timestamp: string;
    congestionLevel: 'low' | 'moderate' | 'high';
    incidentCount: number;
    daysAnalysed: number;
  }> {
    const targetDow = at.getUTCDay(); // 0 = dimanche
    const targetHour = at.getUTCHours(); // heure UTC

    /* ------------------------------------------------------------
     *  Agrégation : total incidents & jours distincts
     * -----------------------------------------------------------*/
    const raw = await this.incidentRepository
      .createQueryBuilder('incident')
      .select('COUNT(*)', 'cnt')
      .addSelect(
        'COUNT(DISTINCT DATE_TRUNC(\'day\', incident."createdAt"))',
        'days',
      )
      .where('EXTRACT(DOW FROM incident."createdAt") = :dow', {
        dow: targetDow,
      })
      .andWhere('EXTRACT(HOUR FROM incident."createdAt") = :hour', {
        hour: targetHour,
      })
      .getRawOne<{ cnt: string; days: string }>();

    const total = Number(raw?.cnt ?? 0);
    const days = Number(raw?.days ?? 0) || 1;
    const avg = total / days;

    /* ------------------------------------------------------------
     *  Classification simple
     * -----------------------------------------------------------*/
    const congestionLevel =
      avg >= MODERATE_THRESHOLD
        ? 'high'
        : avg >= LOW_THRESHOLD
          ? 'moderate'
          : 'low';

    return {
      timestamp: at.toISOString(),
      congestionLevel,
      incidentCount: Math.round(avg),
      daysAnalysed: days,
    };
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
