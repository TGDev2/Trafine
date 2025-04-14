import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident } from './incident.entity';
import { AlertsGateway } from '../alerts/alerts.gateway';
import { CreateIncidentDto } from './create-incident.dto';
import { IncidentVote, VoteType } from './incident-vote.entity';

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
   * Crée un nouvel incident avec les données fournies.
   * Diffuse immédiatement une alerte via WebSocket afin d'informer les utilisateurs.
   * @param data Données validées de l'incident.
   * @returns L'incident créé.
   */
  async createIncident(data: CreateIncidentDto): Promise<Incident> {
    const incident = this.incidentRepository.create(data);
    const savedIncident = await this.incidentRepository.save(incident);
    // Diffusion de l'alerte dès la création de l'incident
    this.alertsGateway.broadcastIncidentAlert(savedIncident);
    return savedIncident;
  }

  /**
   * Récupère tous les incidents enregistrés.
   * @returns Une liste d'incidents.
   */
  async getAllIncidents(): Promise<Incident[]> {
    return await this.incidentRepository.find({ relations: ['votes'] });
  }

  /**
   * Récupère tous les incidents proches d'une position donnée.
   * @param latitude Latitude du centre.
   * @param longitude Longitude du centre.
   * @param delta Valeur maximale de différence en degrés pour qualifier la proximité.
   * @returns Une liste d'incidents se trouvant dans le périmètre défini.
   */
  async findIncidentsNear(
    latitude: number,
    longitude: number,
    delta: number,
  ): Promise<Incident[]> {
    return await this.incidentRepository
      .createQueryBuilder('incident')
      .where('ABS(incident.latitude - :latitude) <= :delta', {
        latitude,
        delta,
      })
      .andWhere('ABS(incident.longitude - :longitude) <= :delta', {
        longitude,
        delta,
      })
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

    // Vérifier si l'utilisateur a déjà voté
    const existingVote = incident.votes.find((v) => v.userId === userId);
    if (existingVote) {
      if (existingVote.vote === vote) {
        // Le vote est identique, aucun changement
        return incident;
      }
      // Mettre à jour le vote existant
      existingVote.vote = vote;
      await this.incidentVoteRepository.save(existingVote);
    } else {
      // Créer un nouveau vote
      const newVote = this.incidentVoteRepository.create({
        incident,
        userId,
        vote,
      });
      await this.incidentVoteRepository.save(newVote);
    }

    // Recharger les votes actualisés
    const updatedIncident = await this.incidentRepository.findOne({
      where: { id: incidentId },
      relations: ['votes'],
    });
    if (!updatedIncident) {
      throw new NotFoundException(
        `Incident with id ${incidentId} not found after voting`,
      );
    }

    // Agréger les votes
    const confirmCount = updatedIncident.votes.filter(
      (v) => v.vote === VoteType.CONFIRM,
    ).length;
    const denyCount = updatedIncident.votes.filter(
      (v) => v.vote === VoteType.DENY,
    ).length;

    // Simple agrégation : l'incident est marqué comme confirmé si les votes positifs dépassent les votes négatifs, et inversement.
    updatedIncident.confirmed = confirmCount > denyCount;
    updatedIncident.denied = denyCount > confirmCount;

    const savedIncident = await this.incidentRepository.save(updatedIncident);

    // Diffuser l'alerte mise à jour
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
}
