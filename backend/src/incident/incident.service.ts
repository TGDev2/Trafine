import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident } from './incident.entity';
import { AlertsGateway } from '../alerts/alerts.gateway';
import { CreateIncidentDto } from './create-incident.dto';

@Injectable()
export class IncidentService {
  constructor(
    @InjectRepository(Incident)
    private incidentRepository: Repository<Incident>,
    private alertsGateway: AlertsGateway,
  ) {}

  /**
   * Crée un nouvel incident avec les données fournies.
   * @param data Données validées de l'incident.
   * @returns L'incident créé.
   */
  async createIncident(data: CreateIncidentDto): Promise<Incident> {
    const incident = this.incidentRepository.create(data);
    return await this.incidentRepository.save(incident);
  }

  /**
   * Récupère tous les incidents enregistrés.
   * @returns Une liste d'incidents.
   */
  async getAllIncidents(): Promise<Incident[]> {
    return await this.incidentRepository.find();
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
   * Confirme un incident en mettant à jour son statut.
   * @param id L'identifiant de l'incident.
   * @returns L'incident mis à jour.
   * @throws NotFoundException si l'incident n'existe pas.
   */
  async confirmIncident(id: number): Promise<Incident> {
    const incident = await this.incidentRepository.findOneBy({ id });
    if (!incident) {
      throw new NotFoundException(`Incident with id ${id} not found`);
    }
    incident.confirmed = true;
    incident.denied = false;
    const updatedIncident = await this.incidentRepository.save(incident);

    this.alertsGateway.broadcastIncidentAlert(updatedIncident);

    return updatedIncident;
  }

  /**
   * Infirme un incident en mettant à jour son statut.
   * @param id L'identifiant de l'incident.
   * @returns L'incident mis à jour.
   * @throws NotFoundException si l'incident n'existe pas.
   */
  async denyIncident(id: number): Promise<Incident> {
    const incident = await this.incidentRepository.findOneBy({ id });
    if (!incident) {
      throw new NotFoundException(`Incident with id ${id} not found`);
    }
    incident.denied = true;
    incident.confirmed = false;
    return await this.incidentRepository.save(incident);
  }
}
