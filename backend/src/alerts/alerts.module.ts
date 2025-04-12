import { Module } from '@nestjs/common';
import { AlertsGateway } from './alerts.gateway';

@Module({
  providers: [AlertsGateway],
  exports: [AlertsGateway],
})
export class AlertsModule {}
