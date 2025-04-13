import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { IncidentService } from './incident.service';
import { Incident } from './incident.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateIncidentDto } from './create-incident.dto';

@Controller('incidents')
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  /**
   * Endpoint POST /incidents
   * Permet de créer un nouvel incident.
   * Exemple de payload JSON :
   * {
   *   "type": "accident",
   *   "description": "Collision sur autoroute",
   *   "latitude": 48.8566,
   *   "longitude": 2.3522
   * }
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() createIncidentDto: CreateIncidentDto,
  ): Promise<Incident> {
    return this.incidentService.createIncident(createIncidentDto);
  }

  /**
   * Endpoint GET /incidents
   * Retourne la liste de tous les incidents.
   */
  @Get()
  async findAll(): Promise<Incident[]> {
    return this.incidentService.getAllIncidents();
  }

  /**
   * Endpoint PATCH /incidents/:id/confirm
   * Confirme un incident en fonction de son identifiant.
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':id/confirm')
  async confirm(@Param('id') id: string): Promise<Incident> {
    return this.incidentService.confirmIncident(Number(id));
  }

  /**
   * Endpoint PATCH /incidents/:id/deny
   * Infirme un incident en fonction de son identifiant.
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':id/deny')
  async deny(@Param('id') id: string): Promise<Incident> {
    return this.incidentService.denyIncident(Number(id));
  }
}
