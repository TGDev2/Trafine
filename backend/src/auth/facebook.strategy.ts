import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('FACEBOOK_CLIENT_ID'),
      clientSecret: configService.get<string>('FACEBOOK_CLIENT_SECRET'),
      callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL'),
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'emails', 'name', 'displayName', 'photos'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any, info?: any) => void,
  ): Promise<any> {
    try {
      const { name, emails, photos } = profile;
      const user = {
        email: emails && emails.length > 0 ? emails[0].value : null,
        firstName: name?.givenName || null,
        lastName: name?.familyName || null,
        picture: photos && photos.length > 0 ? photos[0].value : null,
        accessToken,
      };
      done(null, user);
    } catch (err) {
      throw new UnauthorizedException('Échec de la validation OAuth Facebook');
    }
  }
}
