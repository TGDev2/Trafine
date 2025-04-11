import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

export interface User {
  id: number;
  username: string;
  password: string; // stocké sous forme hachée
}

@Injectable()
export class AuthService {
  private users: User[] = [
    {
      id: 1,
      username: 'testuser',
      password: bcrypt.hashSync('test123', 10), // mot de passe haché avec bcrypt
    },
  ];

  constructor(private jwtService: JwtService) {}

  /**
   * Valide un utilisateur par son username et son mot de passe.
   * @param username Le nom d'utilisateur.
   * @param password Le mot de passe en clair.
   * @returns L'utilisateur validé (sans mot de passe) ou lève une exception.
   */
  async validateUser(username: string, password: string): Promise<any> {
    const user = this.users.find((u) => u.username === username);
    if (user && (await bcrypt.compare(password, user.password))) {
      // On ne retourne pas le mot de passe
      const { password, ...result } = user;
      return result;
    }
    throw new UnauthorizedException('Identifiants invalides');
  }

  /**
   * Génère un token JWT pour l'utilisateur authentifié.
   * @param user L'utilisateur authentifié.
   * @returns Un objet contenant l'access_token.
   */
  async login(user: any) {
    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
