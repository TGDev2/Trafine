import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

/**
 * GoogleStrategy se base sur la stratégie 'passport-google-oauth20'
 * pour authentifier un utilisateur via son compte Google.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  /**
   * validate est appelé après que Google nous ait renvoyé
   * l'information sur l'utilisateur.
   * On peut ici enregistrer l'utilisateur en DB si nécessaire,
   * ou juste le "valider" en renvoyant un objet user minimal.
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { name, emails, photos } = profile;
      const user = {
        email: emails && emails.length > 0 ? emails[0].value : null,
        firstName: (name && name.givenName) || null,
        lastName: (name && name.familyName) || null,
        picture: photos && photos.length > 0 ? photos[0].value : null,
        accessToken,
      };
      done(null, user);
    } catch (err) {
      throw new UnauthorizedException('Échec de la validation OAuth Google');
    }
  }
}
