import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, StrategyOptions } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

interface AuthError extends Error {
  message: string;
  name: string;
  stack?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const options: StrategyOptions = {
      clientID: configService.get<string>('GOOGLE_CLIENT_ID')!,
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET')!,
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL')!,
      scope: ['email', 'profile'],
      passReqToCallback: false,
    };
    super(options);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any, info?: any) => void,
  ): Promise<void> {
    try {
      // Vérification de base du profil
      if (!profile || !profile.id) {
        throw new Error('Profil Google invalide');
      }

      // Vérification de l'horodatage
      const now = Math.floor(Date.now() / 1000);
      if (profile._json && profile._json.iat && profile._json.iat > now) {
        throw new Error('Horodatage du profil invalide');
      }

      // Validation et nettoyage des données du profil
      const sanitizedProfile = {
        id: profile.id,
        emails: profile.emails?.map(e => ({ value: e.value.toLowerCase() })),
        displayName: profile.displayName?.trim(),
        name: profile.name ? {
          givenName: profile.name.givenName?.trim(),
          familyName: profile.name.familyName?.trim()
        } : undefined
      };

      const user = await this.authService.validateOAuthLogin('google', sanitizedProfile);
      done(null, user);
    } catch (error: unknown) {
      // Journalisation sécurisée de l'erreur sans exposer les détails sensibles
      const authError = error as AuthError;
      console.error('Erreur d\'authentification OAuth:', authError.message);
      done(new Error('Échec de l\'authentification Google'), null);
    }
  }
}
