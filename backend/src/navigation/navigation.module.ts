import { Module } from '@nestjs/common';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';
import { IncidentModule } from '../incident/incident.module';
import { BasicRouteCalculationStrategy } from './route-calculation.strategy';

@Module({
  imports: [IncidentModule],
  controllers: [NavigationController],
  providers: [
    NavigationService,
    {
      provide: 'RouteCalculationStrategy',
      useClass: BasicRouteCalculationStrategy,
    },
  ],
  exports: [NavigationService],
})
export class NavigationModule {}
