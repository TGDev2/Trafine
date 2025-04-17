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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateIncidentDto } from './create-incident.dto';
import { IncidentResponseDto } from './dto/incident-response.dto';
import { Incident } from './incident.entity';

@Controller('incidents')
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  private toDto(incident: Incident): IncidentResponseDto {
    return {
      id: incident.id,
      type: incident.type,
      description: incident.description,
      confirmed: incident.confirmed,
      denied: incident.denied,
      latitude: incident.latitude,
      longitude: incident.longitude,
    };
  }

  /** POST /incidents */
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() createIncidentDto: CreateIncidentDto,
  ): Promise<IncidentResponseDto> {
    const incident =
      await this.incidentService.createIncident(createIncidentDto);
    return this.toDto(incident);
  }

  /** GET /incidents */
  @Get()
  async findAll(): Promise<IncidentResponseDto[]> {
    const incidents = await this.incidentService.getAllIncidents();
    return incidents.map((inc) => this.toDto(inc));
  }

  /** PATCH /incidents/:id/confirm */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  @Patch(':id/confirm')
  async confirm(@Param('id') id: string): Promise<IncidentResponseDto> {
    const incident = await this.incidentService.confirmIncident(
      Number(id),
      /* userId inutile ici */ 0,
    );
    return this.toDto(incident);
  }

  /** PATCH /incidents/:id/deny */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  @Patch(':id/deny')
  async deny(@Param('id') id: string): Promise<IncidentResponseDto> {
    const incident = await this.incidentService.denyIncident(
      Number(id),
      /* userId inutile ici */ 0,
    );
    return this.toDto(incident);
  }
}
