import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  ParseEnumPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { IncidentService } from './incident.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateIncidentDto } from './create-incident.dto';
import { IncidentResponseDto } from './dto/incident-response.dto';
import { Incident } from './incident.entity';
import { UpdateIncidentDto } from './update-incident.dto';
import { Delete } from '@nestjs/common';

type IncidentStatus = 'active' | 'expired' | 'archived' | 'all';

@Controller('incidents')
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  /** Conversion Entity → DTO (centralisée) */
  private toDto(incident: Incident): IncidentResponseDto {
    return {
      id: incident.id,
      type: incident.type,
      description: incident.description,
      confirmed: incident.confirmed,
      denied: incident.denied,
      latitude: incident.latitude,
      longitude: incident.longitude,
      status: incident.status,
    };
  }

  /* ------------------ CRUD ------------------ */

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() dto: CreateIncidentDto,
    @Req() req: Request,
  ): Promise<IncidentResponseDto> {
    const incident = await this.incidentService.createIncident(dto);
    return this.toDto(incident);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('moderator', 'admin')
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIncidentDto,
  ): Promise<IncidentResponseDto> {
    const incident = await this.incidentService.updateIncident(id, dto);
    return this.toDto(incident);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.incidentService.deleteIncident(id);
    return { ok: true };
  }

  @Get()
  async findAll(
    @Query(
      'status',
      new ParseEnumPipe(['active', 'expired', 'archived', 'all'], {
        optional: true,
      }),
    )
    status: IncidentStatus = 'active',
  ): Promise<IncidentResponseDto[]> {
    const incidents = await this.incidentService.getAllIncidents(status);
    return incidents.map((i) => this.toDto(i));
  }

  /* ----------  Votes utilisateur ---------- */

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'moderator', 'admin')
  @Patch(':id/confirm')
  async confirm(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { userId: number } },
  ): Promise<IncidentResponseDto> {
    const incident = await this.incidentService.confirmIncident(
      id,
      req.user.userId,
    );
    return this.toDto(incident);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'moderator', 'admin')
  @Patch(':id/deny')
  async deny(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { userId: number } },
  ): Promise<IncidentResponseDto> {
    const incident = await this.incidentService.denyIncident(
      id,
      req.user.userId,
    );
    return this.toDto(incident);
  }

  /* ----------  Archivage (modérateurs / admins) ---------- */

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('moderator', 'admin')
  @Patch(':id/archive')
  async archive(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<IncidentResponseDto> {
    const incident = await this.incidentService.archiveIncident(id);
    return this.toDto(incident);
  }

  @Delete()
  async deleteAll() {
    // Logique pour supprimer tous les incidents
    return await this.incidentService.deleteAllIncidents();
  }
}
