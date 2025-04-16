import { Module } from '@nestjs/common';
import { AlertsGateway } from './alerts.gateway';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    AuthModule,
    JwtModule,
  ],
  providers: [AlertsGateway],
  exports: [AlertsGateway],
})
export class AlertsModule {}