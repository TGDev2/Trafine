import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    // Les champs par défaut "username" et "password" sont utilisés.
    super();
  }

  /**
   * Méthode de validation appelée par Passport.
   * @param username Le nom d'utilisateur fourni.
   * @param password Le mot de passe fourni.
   * @returns L'utilisateur validé ou lève UnauthorizedException.
   */
  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
