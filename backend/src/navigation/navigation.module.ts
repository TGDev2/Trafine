import { Module } from '@nestjs/common';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';
import { IncidentModule } from '../incident/incident.module';

@Module({
  imports: [IncidentModule],
  controllers: [NavigationController],
  providers: [NavigationService],
})
export class NavigationModule {}
