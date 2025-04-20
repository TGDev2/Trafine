import { Module } from '@nestjs/common';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';
import { IncidentModule } from '../incident/incident.module';
import { OsrmRouteCalculationStrategy } from './osrm-route-calculation.strategy';
import { RouteCalculationStrategyImpl } from './route-calculation.strategy';

const RouteStrategyProvider = {
  provide: 'RouteCalculationStrategy',
  useClass:
    process.env.NODE_ENV === 'test'
      ? RouteCalculationStrategyImpl
      : OsrmRouteCalculationStrategy,
};

@Module({
  imports: [IncidentModule],
  controllers: [NavigationController],
  providers: [NavigationService, RouteStrategyProvider],
  exports: [NavigationService],
})
export class NavigationModule {}
