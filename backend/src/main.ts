import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { SanitizationPipe } from './common/filters/sanitize.pipe';
import { ConfigService } from '@nestjs/config';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import * as cookieParser from 'cookie-parser';
import * as csurf from 'csurf';
import { Request, Response, NextFunction } from 'express';
import { CsrfExceptionFilter } from './common/filters/csrf-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const allowedOrigins = configService
    .get<string>('ALLOWED_WEB_ORIGINS')!
    .split(',')
    .map((u) => u.trim());

  const corsOptions: CorsOptions = {
    origin:
      process.env.NODE_ENV === 'development'
        ? (_, cb) => cb(null, true)
        : allowedOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  };

  app.enableCors(corsOptions);

  /* ---------------- Middlewares de sécurité ---------------- */
  app.use(helmet());
  app.use(cookieParser());

  /* ----------- CSRF protection ----------- */
  if (process.env.NODE_ENV !== 'test') {
    const csrfMw = csurf({
      cookie: {
        key: 'XSRF-TOKEN',
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      },
      ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    });

    // Applique la protection sauf pour les routes d’auth ou les requêtes sans cookie (ex. mobile)
    app.use((req: Request, res: Response, next: NextFunction) => {
      const isAuthRoute = req.path.startsWith('/auth');
      const hasCsrfCookie = req.headers.cookie?.includes('XSRF-TOKEN');
      if (isAuthRoute || !hasCsrfCookie) return next();
      return csrfMw(req, res, next);
    });
  }

  // Publie le token CSRF dans un cookie accessible au front
  app.use((req: Request, res: Response, next: NextFunction) => {
    const tokenFn = (req as any).csrfToken as (() => string) | undefined;
    if (tokenFn) {
      res.cookie('XSRF-TOKEN', tokenFn(), {
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      });
    }
    next();
  });

  /* ---------------- Pipes & filtres globaux ---------------- */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
    new SanitizationPipe(),
  );
  app.useGlobalFilters(new AllExceptionsFilter(), new CsrfExceptionFilter());

  /* ---------------- Swagger ---------------- */
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Trafine API')
    .setDescription('API de navigation en temps réel pour Trafine')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

bootstrap();
