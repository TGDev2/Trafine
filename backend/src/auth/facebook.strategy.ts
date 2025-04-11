import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, StrategyOptions } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';

// Interface pour typer les champs spécifiques du profil Facebook
interface FacebookProfile extends Profile {
  emails?: { value: string }[];
  name?: { givenName: string; familyName: string };
  photos?: { value: string }[];
}

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private configService: ConfigService) {
    const options: StrategyOptions = {
      clientID: configService.get<string>('FACEBOOK_CLIENT_ID')!,
      clientSecret: configService.get<string>('FACEBOOK_CLIENT_SECRET')!,
      callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL')!,
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'emails', 'name', 'displayName', 'photos'],
    };
    super(options);
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: FacebookProfile,
    done: (error: any, user?: any, info?: any) => void,
  ): any {
    try {
      const emails = profile.emails;
      const name = profile.name;
      const photos = profile.photos;
      const user = {
        email: emails && emails.length > 0 ? emails[0].value : null,
        firstName: name?.givenName ?? null,
        lastName: name?.familyName ?? null,
        picture: photos && photos.length > 0 ? photos[0].value : null,
        accessToken,
      };
      done(null, user);
    } catch (err: unknown) {
      if (err instanceof Error) {
        return done(err, null);
      } else {
        return done(new Error(String(err)), null);
      }
    }
  }
}
