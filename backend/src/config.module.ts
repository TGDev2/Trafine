import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        DATABASE_HOST: Joi.string().required(),
        DATABASE_PORT: Joi.number().default(5432),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
        POSTGRES_DB: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_CALLBACK_URL: Joi.string().uri().required(),
        FACEBOOK_CLIENT_ID: Joi.string().required(),
        FACEBOOK_CLIENT_SECRET: Joi.string().required(),
        FACEBOOK_CALLBACK_URL: Joi.string().uri().required(),
        ALLOWED_REDIRECT_URLS: Joi.string()
          .required()
          .custom((value: string, helpers: Joi.CustomHelpers) => {
            // Split the CSV, trim entries, and validate each URL against a regex
            const list = value.split(',').map((u: string) => u.trim());
            const urlRegex = /^(https?:\/\/|[a-z]+:\/\/).+/i;
            if (!list.every((u: string) => urlRegex.test(u))) {
              return helpers.error('any.invalid');
            }
            return value;
          }, 'uri-list validation'),
      }),
    }),
  ],
})
export class AppConfigModule {}
