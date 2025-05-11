import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { SanitizationPipe } from './common/filters/sanitize.pipe';
import { ConfigService } from '@nestjs/config';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import cookieParser from 'cookie-parser';
import * as csurf from 'csurf';
import { Request, Response, NextFunction } from 'express';
import { CsrfExceptionFilter } from './common/filters/csrf-exception.filter';
import * as fs from 'fs';
import * as path from 'path';
import { csrfExcludeBearer } from './common/middleware/csrf-exclude-bearer.middleware';

async function bootstrap() {
  /* ------------------------------------------------------------------
   *  TLS (optionnel)
   * -----------------------------------------------------------------*/
  const cfg = new ConfigService();
  const keyPath = cfg.get<string>('TLS_KEY_FILE');
  const certPath = cfg.get<string>('TLS_CERT_FILE');
  const httpsOptions =
    process.env.NODE_ENV === 'production'
      ? (() => {
          if (!keyPath || !certPath)
            throw new Error(
              'TLS_KEY_FILE et TLS_CERT_FILE doivent être définis en production.',
            );
          const resolvedKey = path.resolve(keyPath);
          const resolvedCert = path.resolve(certPath);
          if (!fs.existsSync(resolvedKey) || !fs.existsSync(resolvedCert))
            throw new Error(
              `Fichiers TLS introuvables : ${resolvedKey} / ${resolvedCert}`,
            );
          return {
            key: fs.readFileSync(resolvedKey),
            cert: fs.readFileSync(resolvedCert),
          };
        })()
      : undefined;

  const app = await NestFactory.create(
    AppModule,
    httpsOptions ? { httpsOptions } : {},
  );

  /* --------------------------- CORS --------------------------- */
  const allowedOrigins = cfg
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

  /* ----------------------- CSRF ----------------------------- */
  if (process.env.NODE_ENV !== 'test') {
    // ✅  nouvelle protection : CSRF appliqué sauf si JWT Bearer présent
    app.use(csrfExcludeBearer);

    // (optionnel mais recommandé) — renvoie automatiquement un XSRF-TOKEN
    app.use((req: Request, res: Response, next: NextFunction) => {
      // si le middleware précédent a défini req.csrfToken, on pousse le cookie
      // (uniquement pour le front web)
      if (typeof (req as any).csrfToken === 'function') {
        res.cookie('XSRF-TOKEN', (req as any).csrfToken(), {
          httpOnly: false,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
        });
      }
      next();
    });
  }

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

  /* ---------------- Lancement ---------------- */
  const PORT = Number(process.env.PORT ?? (httpsOptions ? 3443 : 3000));
  await app.listen(PORT, '0.0.0.0');
  console.log(
    `✅  Backend lancé en ${httpsOptions ? 'HTTPS' : 'HTTP'} sur le port ${PORT}`,
  );
}

bootstrap();
