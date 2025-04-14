import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { IncidentService } from './incident.service';
import { Incident } from './incident.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateIncidentDto } from './create-incident.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    username: string;
    // autres propriétés éventuellement ajoutées par le middleware JWT
  };
}

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
   * Permet à un utilisateur de confirmer un incident.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  @Patch(':id/confirm')
  async confirm(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Incident> {
    return this.incidentService.confirmIncident(Number(id), req.user.id);
  }

  /**
   * Endpoint PATCH /incidents/:id/deny
   * Permet à un utilisateur d'infirmer un incident.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  @Patch(':id/deny')
  async deny(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Incident> {
    return this.incidentService.denyIncident(Number(id), req.user.id);
  }
}
