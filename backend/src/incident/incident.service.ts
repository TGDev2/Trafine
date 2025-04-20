import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident } from './incident.entity';
import { AlertsGateway } from '../alerts/alerts.gateway';
import { CreateIncidentDto } from './create-incident.dto';
import { IncidentVote, VoteType } from './incident-vote.entity';
import { Cron } from '@nestjs/schedule';

const INCIDENT_VALIDITY_DURATION = 4 * 60 * 60 * 1000; // 4 h en ms

type IncidentStatus = 'active' | 'expired' | 'archived' | 'all';

@Injectable()
export class IncidentService {
  constructor(
    @InjectRepository(Incident)
    private incidentRepository: Repository<Incident>,
    @InjectRepository(IncidentVote)
    private incidentVoteRepository: Repository<IncidentVote>,
    private alertsGateway: AlertsGateway,
  ) {}

  /**
   * Archive définitivement un incident (modération manuelle).
   * @param incidentId Identifiant de l’incident
   */
  async archiveIncident(incidentId: number): Promise<Incident> {
    const incident = await this.incidentRepository.findOne({
      where: { id: incidentId },
    });
    if (!incident) {
      throw new NotFoundException(`Incident with id ${incidentId} not found`);
    }
    if (incident.status === 'archived') {
      return incident;
    }
    incident.status = 'archived';
    return this.incidentRepository.save(incident);
  }

  /**
   * Crée un nouvel incident avec les données fournies.
   * Diffuse immédiatement une alerte via WebSocket afin d'informer les utilisateurs.
   * @param data Données validées de l'incident.
   * @returns L'incident créé.
   */
  async createIncident(data: CreateIncidentDto): Promise<Incident> {
    const incidentData: Partial<Incident> = {
      type: data.type,
      description: data.description,
      location: {
        type: 'Point',
        coordinates: [data.longitude, data.latitude],
      },
      status: 'active' as 'active',
      expirationDate: new Date(Date.now() + INCIDENT_VALIDITY_DURATION),
      lastConfirmationDate: new Date(),
    };

    const incident = this.incidentRepository.create(incidentData);
    const savedIncident = await this.incidentRepository.save(incident);
    this.alertsGateway.broadcastIncidentAlert(savedIncident);
    return savedIncident;
  }

  /**
   * Récupère tous les incidents enregistrés.
   * @returns Une liste d'incidents.
   */
  async getAllIncidents(
    status: IncidentStatus = 'active',
  ): Promise<Incident[]> {
    const qb = this.incidentRepository
      .createQueryBuilder('incident')
      .leftJoinAndSelect('incident.votes', 'vote');

    if (status !== 'all') {
      qb.where('incident.status = :status', { status });
    }
    return qb.getMany();
  }

  /**
   * Récupère tous les incidents proches d'une position donnée en utilisant PostGIS.
   * @param latitude Latitude du centre.
   * @param longitude Longitude du centre.
   * @param delta Distance en degrés approximatifs (1° ≈ 111 km) pour convertir en mètres.
   * @returns Une liste d'incidents se trouvant dans le périmètre défini.
   */
  async findIncidentsNear(
    latitude: number,
    longitude: number,
    delta: number,
  ): Promise<Incident[]> {
    const distanceInMeters = delta * 111_000;
    return this.incidentRepository
      .createQueryBuilder('incident')
      .where(
        'ST_DWithin(incident.location::geography,' +
          ' ST_SetSRID(ST_MakePoint(:lon, :lat),4326)::geography,' +
          ' :distance)',
        { lat: latitude, lon: longitude, distance: distanceInMeters },
      )
      .andWhere('incident.status = :status', { status: 'active' })
      .andWhere('incident.confirmed = true') // évite les incidents non validés
      .getMany();
  }

  /**
   * Enregistre le vote d'un utilisateur pour un incident et réévalue l'état de celui-ci.
   * @param incidentId L'identifiant de l'incident.
   * @param userId L'identifiant de l'utilisateur votant.
   * @param vote Le type de vote (confirm ou deny).
   */
  async voteOnIncident(
    incidentId: number,
    userId: number,
    vote: VoteType,
  ): Promise<Incident> {
    const incident = await this.incidentRepository.findOne({
      where: { id: incidentId },
      relations: ['votes'],
    });
    if (!incident) {
      throw new NotFoundException(`Incident with id ${incidentId} not found`);
    }

    const existingVote = incident.votes.find((v) => v.userId === userId);
    if (existingVote) {
      if (existingVote.vote === vote) {
        return incident;
      }
      existingVote.vote = vote;
      await this.incidentVoteRepository.save(existingVote);
    } else {
      const newVote = this.incidentVoteRepository.create({
        incident,
        userId,
        vote,
      });
      await this.incidentVoteRepository.save(newVote);
    }

    const updatedIncident = await this.incidentRepository.findOne({
      where: { id: incidentId },
      relations: ['votes'],
    });
    if (!updatedIncident) {
      throw new NotFoundException(
        `Incident with id ${incidentId} not found after voting`,
      );
    }

    const confirmCount = updatedIncident.votes.filter(
      (v) => v.vote === VoteType.CONFIRM,
    ).length;
    const denyCount = updatedIncident.votes.filter(
      (v) => v.vote === VoteType.DENY,
    ).length;

    updatedIncident.confirmed = confirmCount > denyCount;
    updatedIncident.denied = denyCount > confirmCount;

    // Si le vote est une confirmation, mettre à jour la date d'expiration et la dernière confirmation
    if (vote === VoteType.CONFIRM) {
      updatedIncident.expirationDate = new Date(
        Date.now() + INCIDENT_VALIDITY_DURATION,
      );
      updatedIncident.lastConfirmationDate = new Date();
    }

    const savedIncident = await this.incidentRepository.save(updatedIncident);
    this.alertsGateway.broadcastIncidentAlert(savedIncident);
    return savedIncident;
  }

  /**
   * Endpoint utilisé par le contrôleur pour confirmer un incident.
   */
  async confirmIncident(incidentId: number, userId: number): Promise<Incident> {
    return this.voteOnIncident(incidentId, userId, VoteType.CONFIRM);
  }

  /**
   * Endpoint utilisé par le contrôleur pour infirmer un incident.
   */
  async denyIncident(incidentId: number, userId: number): Promise<Incident> {
    return this.voteOnIncident(incidentId, userId, VoteType.DENY);
  }

  // Méthode de nettoyage des incidents expirés, exécutée toutes les 30 minutes
  @Cron('0 */30 * * * *')
  async cleanExpiredIncidents() {
    await this.incidentRepository
      .createQueryBuilder()
      .update(Incident)
      .set({ status: 'expired' as 'expired' })
      .where('expirationDate < :threshold', { threshold: new Date() })
      .andWhere("status = 'active'")
      .execute();
  }
}
