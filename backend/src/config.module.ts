import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import * as crypto from 'crypto';

/**
 * Génère une chaîne hexadécimale de longueur <bytes>*2.
 */
function randomHex(bytes: number): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Valeurs par défaut uniquement pour les environnements non-prod.
 *  - Clés à 32 octets pour AES-256 / JWT
 *  - Identifiants OAuth factices (les vrais seront fournis en production)
 */
const DEV_DEFAULTS = {
  ENCRYPTION_KEY: randomHex(16),       // 32 car.
  JWT_SECRET: randomHex(32),       // 64 car.
  GOOGLE_CLIENT_ID: 'dummy-google-id',
  GOOGLE_CLIENT_SECRET: 'dummy-google-secret',
  GOOGLE_CALLBACK_URL: 'http://localhost:3000/auth/google/callback',
  ALLOWED_REDIRECT_URLS: 'http://localhost:3001,myapp://redirect',
  ALLOWED_WEB_ORIGINS: 'http://localhost:3001,http://localhost:19006',
  ORS_BASE_URL: 'https://api.openrouteservice.org',
  ORS_API_KEY: '',
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      expandVariables: true,
      load: [
        () => {
          if (
            process.env.NODE_ENV !== 'production' &&
            process.env.NODE_ENV !== 'test'
          ) {
            Object.entries(DEV_DEFAULTS).forEach(([k, v]) => {
              if (!process.env[k]) process.env[k] = v;
            });
          }
          return {};
        },
      ],
      /* ---------------- Validation ---------------- */
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),

        DATABASE_HOST: Joi.string().default('postgres'),
        DATABASE_PORT: Joi.number().default(5432),
        POSTGRES_USER: Joi.string().default('postgres'),
        POSTGRES_PASSWORD: Joi.string().default('postgres'),
        POSTGRES_DB: Joi.string().default('trafine'),

        JWT_SECRET: Joi.when('NODE_ENV', {
          is: 'production',
          then: Joi.string().required(),
          otherwise: Joi.string().default(DEV_DEFAULTS.JWT_SECRET),
        }),

        ENCRYPTION_KEY: Joi.when('NODE_ENV', {
          is: 'test',
          then: Joi.string().length(32).default('TEST_ENCRYPTION_KEY_32_CHARS_!!'),
          otherwise: Joi.string().length(32).default(DEV_DEFAULTS.ENCRYPTION_KEY),
        }),

        GOOGLE_CLIENT_ID: Joi.when('NODE_ENV', {
          is: 'production',
          then: Joi.string().required(),
          otherwise: Joi.string().default(DEV_DEFAULTS.GOOGLE_CLIENT_ID),
        }),
        GOOGLE_CLIENT_SECRET: Joi.when('NODE_ENV', {
          is: 'production',
          then: Joi.string().required(),
          otherwise: Joi.string().default(DEV_DEFAULTS.GOOGLE_CLIENT_SECRET),
        }),

        GOOGLE_CALLBACK_URL: Joi.string().uri().default(DEV_DEFAULTS.GOOGLE_CALLBACK_URL),

        ADMIN_USERNAME: Joi.string().default('admin'),
        ADMIN_PASSWORD: Joi.string().min(4).default('admin'),

        ALLOWED_REDIRECT_URLS: Joi.string().default(DEV_DEFAULTS.ALLOWED_REDIRECT_URLS),

        // CORS : liste d’origines autorisées pour le web/frontend
        ALLOWED_WEB_ORIGINS: Joi.when('NODE_ENV', {
          is: 'production',
          then: Joi.string().required(),
          otherwise: Joi.string().default(DEV_DEFAULTS.ALLOWED_WEB_ORIGINS),
        }),

        /* ---- OpenRouteService ---- */
        ORS_BASE_URL: Joi.string().uri().default(DEV_DEFAULTS.ORS_BASE_URL),
        ORS_API_KEY: Joi.when('NODE_ENV', {
          is: 'production',
          then: Joi.string().required(),  // obligatoire en prod
          otherwise: Joi.string().allow('').default(DEV_DEFAULTS.ORS_API_KEY),
        }),
      }),
    }),
  ],
})
export class AppConfigModule { }
