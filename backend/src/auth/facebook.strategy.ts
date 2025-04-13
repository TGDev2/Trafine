import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, StrategyOptions } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const options: StrategyOptions = {
      clientID: configService.get<string>('FACEBOOK_CLIENT_ID')!,
      clientSecret: configService.get<string>('FACEBOOK_CLIENT_SECRET')!,
      callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL')!,
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'emails', 'name', 'displayName', 'photos'],
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
      const user = await this.authService.validateOAuthLogin(
        'facebook',
        profile,
      );
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}
