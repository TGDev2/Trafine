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
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('incidents')
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  /**
   * Endpoint POST /incidents
   * Permet de créer un nouvel incident.
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
   * Seuls les utilisateurs authentifiés avec le rôle 'user' peuvent confirmer un incident.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  @Patch(':id/confirm')
  async confirm(@Param('id') id: string): Promise<Incident> {
    return this.incidentService.confirmIncident(Number(id));
  }

  /**
   * Endpoint PATCH /incidents/:id/deny
   * Infirme un incident en fonction de son identifiant.
   * Seuls les utilisateurs authentifiés avec le rôle 'user' peuvent infirmer un incident.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  @Patch(':id/deny')
  async deny(@Param('id') id: string): Promise<Incident> {
    return this.incidentService.denyIncident(Number(id));
  }
}
