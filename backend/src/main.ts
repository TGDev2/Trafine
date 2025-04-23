import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { SanitizationPipe } from './common/filters/sanitize.pipe';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /* -------------------------------------------------
   *  Sécurité : CORS + Helmet + CSRF
   * ------------------------------------------------*/
  app.enableCors({
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
    credentials: true,
  });
  app.use(helmet());

  if (process.env.NODE_ENV !== 'test') {
    app.use(cookieParser());
    app.use(
      csurf({
        cookie: {
          httpOnly: true,
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
        },
        ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
      }),
    );

    // Expose le token CSRF dans un cookie XSRF-TOKEN
    app.use((req: Request, res: Response, next: NextFunction) => {
      const token = (req as any).csrfToken?.();
      if (token) {
        res.cookie('XSRF-TOKEN', token, {
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
        });
      }
      next();
    });
  }

  /* -------------------------------------------------
   *  Filtres & Pipes globaux
   * ------------------------------------------------*/
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
    new SanitizationPipe(),
  );

  /* -------------------------------------------------
   *  Swagger
   * ------------------------------------------------*/
  const config = new DocumentBuilder()
    .setTitle('Trafine API')
    .setDescription('API de navigation en temps réel pour Trafine')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .addSecurity('XSRF', {
      type: 'apiKey',
      in: 'header',
      name: 'x-csrf-token',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

bootstrap();
