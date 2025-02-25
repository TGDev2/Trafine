import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      // Extraction du token depuis l'en-tête Authorization sous la forme Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Récupération de la clé secrète dans le fichier .env via ConfigService
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Méthode de validation appelée après décryptage du token.
   * @param payload Le contenu du token.
   * @returns Un objet contenant l'identifiant et le nom d'utilisateur.
   */
  async validate(payload: any) {
    return { userId: payload.sub, username: payload.username };
  }
}
