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
import { Request } from 'express';
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

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() dto: CreateIncidentDto,
    @Req() req: Request,
  ): Promise<IncidentResponseDto> {
    const incident = await this.incidentService.createIncident(dto);
    return this.toDto(incident);
  }

  @Get()
  async findAll(): Promise<IncidentResponseDto[]> {
    const incidents = await this.incidentService.getAllIncidents();
    return incidents.map((i) => this.toDto(i));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  @Patch(':id/confirm')
  async confirm(
    @Param('id') id: string,
    @Req() req: Request & { user: { userId: number } },
  ): Promise<IncidentResponseDto> {
    const incident = await this.incidentService.confirmIncident(
      Number(id),
      req.user.userId,
    );
    return this.toDto(incident);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  @Patch(':id/deny')
  async deny(
    @Param('id') id: string,
    @Req() req: Request & { user: { userId: number } },
  ): Promise<IncidentResponseDto> {
    const incident = await this.incidentService.denyIncident(
      Number(id),
      req.user.userId,
    );
    return this.toDto(incident);
  }
}
