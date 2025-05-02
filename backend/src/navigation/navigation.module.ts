import { Module } from '@nestjs/common';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';
import { IncidentModule } from '../incident/incident.module';
import { OrsRouteCalculationStrategy } from './ors-route-calculation.strategy';
import { RouteCalculationStrategyImpl } from './route-calculation.strategy';
import { AlertsModule } from '../alerts/alerts.module';

const RouteStrategyProvider = {
  provide: 'RouteCalculationStrategy',
  useClass:
    process.env.NODE_ENV === 'test'
      ? RouteCalculationStrategyImpl
      : OrsRouteCalculationStrategy,
};

@Module({
  imports: [IncidentModule, AlertsModule],
  controllers: [NavigationController],
  providers: [NavigationService, RouteStrategyProvider],
  exports: [NavigationService],
})
export class NavigationModule {}
