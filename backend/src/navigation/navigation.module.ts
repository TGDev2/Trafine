import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';
import { IncidentModule } from '../incident/incident.module';
import { OrsRouteCalculationStrategy } from './ors-route-calculation.strategy';
import { RouteCalculationStrategyImpl } from './route-calculation.strategy';
import { ShareableRoute } from './entities/shareable-route.entity';
import { ShareRedirectController } from './share-redirect.controller';
import { IncidentService } from '../incident/incident.service';
import { AlertsModule } from '../alerts/alerts.module';
import {
  RouteCalculationStrategy,
} from './route-calculation.strategy';

/* ------------------------------------------------------------------ */
/*  Choix dynamique de stratégie                                       */
/* ------------------------------------------------------------------ */
const RouteStrategyProvider = {
  provide: 'RouteCalculationStrategy',
  inject: [ConfigService, IncidentService],
  useFactory: (
    config: ConfigService,
    incidentSvc: IncidentService,
  ): RouteCalculationStrategy => {
    const env = config.get<string>('NODE_ENV');
    const orsKey = config.get<string>('ORS_API_KEY');

    /* • Tests ⇒ impl interne            */
    /* • Dev sans clé ⇒ impl interne     */
    if (env === 'test' || !orsKey) {
      return new RouteCalculationStrategyImpl(incidentSvc);
    }

    /* • Clé présente ⇒ OpenRouteService */
    return new OrsRouteCalculationStrategy();
  },
};

@Module({
  imports: [
    TypeOrmModule.forFeature([ShareableRoute]),
    IncidentModule,
    AlertsModule,
  ],
  controllers: [NavigationController, ShareRedirectController],
  providers: [
    NavigationService,
    RouteStrategyProvider,
  ],
  exports: [NavigationService],
})
export class NavigationModule { }
