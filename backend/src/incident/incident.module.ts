import { Module } from '@nestjs/common';
import { IncidentService } from './incident.service';
import { IncidentController } from './incident.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Incident } from './incident.entity';
import { IncidentVote } from './incident-vote.entity';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [TypeOrmModule.forFeature([Incident, IncidentVote]), AlertsModule],
  controllers: [IncidentController],
  providers: [IncidentService],
  exports: [IncidentService],
})
export class IncidentModule {}
