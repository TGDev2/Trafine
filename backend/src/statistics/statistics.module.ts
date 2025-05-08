import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Incident } from '../incident/incident.entity';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { MLPredictionService } from './ml-prediction.service';

@Module({
  imports: [TypeOrmModule.forFeature([Incident])],
  controllers: [StatisticsController],
  providers: [StatisticsService, MLPredictionService],
})
export class StatisticsModule {}
