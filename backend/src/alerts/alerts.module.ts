import { Module } from '@nestjs/common';
import { AlertsGateway } from './alerts.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [AlertsGateway],
  exports: [AlertsGateway],
})
export class AlertsModule {}