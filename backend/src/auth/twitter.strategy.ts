// backend/src/auth/twitter.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy as TwitterStrategy,
  IStrategyOption,
  Profile,
} from 'passport-twitter';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class TwitterAuthStrategy extends PassportStrategy(
  TwitterStrategy,
  'twitter',
) {
  constructor(
    private readonly cfg: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      consumerKey: cfg.get<string>('TWITTER_CONSUMER_KEY')!,
      consumerSecret: cfg.get<string>('TWITTER_CONSUMER_SECRET')!,
      callbackURL: cfg.get<string>('TWITTER_CALLBACK_URL')!,
      includeEmail: true,
    } as IStrategyOption);
  }

  async validate(
    token: string,
    tokenSecret: string,
    profile: Profile,
    done: (err: any, user?: any) => void,
  ) {
    try {
      const user = await this.authService.validateOAuthLogin(
        'twitter',
        profile,
      );
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }
}