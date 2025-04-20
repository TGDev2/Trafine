import { Module } from '@nestjs/common';
import { AppConfigModule } from './config.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { NavigationModule } from './navigation/navigation.module';
import { IncidentModule } from './incident/incident.module';
import { UserModule } from './user/user.module';
import { AlertsModule } from './alerts/alerts.module';
import { StatisticsModule } from './statistics/statistics.module';
import { HealthModule } from './health/health.module';
import { AdminSeed } from './user/admin.seed';
import { PostgisInitService } from './postgis-init.service';

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    AuthModule,
    NavigationModule,
    IncidentModule,
    UserModule,
    AlertsModule,
    StatisticsModule,
    HealthModule,
  ],
  controllers: [],
  providers: [AdminSeed, PostgisInitService],
})
export class AppModule {}
