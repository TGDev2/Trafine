import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  /**
   * Valide un utilisateur par son username et son mot de passe.
   * @param username Le nom d'utilisateur.
   * @param password Le mot de passe en clair.
   * @returns L'utilisateur validé (sans le mot de passe) ou lève une exception.
   */
  async validateUser(
    username: string,
    password: string,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.userService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException(
        'Nom d’utilisateur ou mot de passe incorrect',
      );
    }
    const isPasswordValid = await this.userService.verifyPassword(
      user,
      password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'Nom d’utilisateur ou mot de passe incorrect',
      );
    }
    const { password: _ignored, ...result } = user;
    return result;
  }

  /**
   * Génère un token JWT pour l'utilisateur authentifié.
   * @param user L'utilisateur authentifié.
   * @returns Un objet contenant l'access_token.
   */
  login(user: { username: string; id: number }): { access_token: string } {
    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
