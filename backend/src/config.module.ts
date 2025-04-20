import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

const TEST_KEY = 'TEST_ENCRYPTION_KEY_32_CHARS_!!';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),

        DATABASE_HOST: Joi.string().required(),
        DATABASE_PORT: Joi.number().default(5432),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
        POSTGRES_DB: Joi.string().required(),

        JWT_SECRET: Joi.string().required(),

        ENCRYPTION_KEY: Joi.when('NODE_ENV', {
          is: 'test',
          then: Joi.string().length(32).default(TEST_KEY),
          otherwise: Joi.string().length(32).required(),
        }),

        /** OAuth */
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_CALLBACK_URL: Joi.string().uri().required(),
        FACEBOOK_CLIENT_ID: Joi.string().required(),
        FACEBOOK_CLIENT_SECRET: Joi.string().required(),
        FACEBOOK_CALLBACK_URL: Joi.string().uri().required(),

        ALLOWED_REDIRECT_URLS: Joi.string()
          .required()
          .custom((value: string, helpers: Joi.CustomHelpers) => {
            const list = value.split(',').map((u) => u.trim());
            const urlRegex = /^(https?:\/\/|[a-z]+:\/\/).+/i;
            if (!list.every((u) => urlRegex.test(u))) {
              return helpers.error('any.invalid');
            }
            return value;
          }, 'uri-list validation'),
      }),
      expandVariables: true,
    }),
  ],
})
export class AppConfigModule {}
