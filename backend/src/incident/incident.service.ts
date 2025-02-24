import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident } from './incident.entity';

@Injectable()
export class IncidentService {
  constructor(
    @InjectRepository(Incident)
    private incidentRepository: Repository<Incident>,
  ) {}

  /**
   * Crée un nouvel incident avec les données fournies.
   * @param data Données partielles de l'incident.
   * @returns L'incident créé.
   */
  async createIncident(data: Partial<Incident>): Promise<Incident> {
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
    return await this.incidentRepository.save(incident);
  }
}
