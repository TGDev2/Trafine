import { Module } from '@nestjs/common';
import { AppConfigModule } from './config.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { NavigationModule } from './navigation/navigation.module';

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    AuthModule,
    NavigationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
