import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';
import { RegisterUserDto } from './auth.dto';

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

  /**
   * Crée un nouvel utilisateur (username + password),
   * en vérifiant que le nom d’utilisateur n’existe pas déjà.
   * @param registerUserDto Les informations d'inscription.
   * @returns Un objet contenant l'access_token pour l’utilisateur créé.
   */
  async register(
    registerUserDto: RegisterUserDto,
  ): Promise<{ access_token: string }> {
    const newUser = await this.userService.createUser(
      registerUserDto.username,
      registerUserDto.password,
    );
    return this.login({ username: newUser.username, id: newUser.id });
  }

  /**
   * Valide un utilisateur OAuth.
   * Si l'utilisateur n'existe pas, il est créé.
   * @param provider Le fournisseur OAuth (google, facebook, etc.)
   * @param profile Le profil reçu du fournisseur OAuth.
   * @returns L'objet utilisateur normalisé (sans le mot de passe).
   */
  async validateOAuthLogin(
    provider: string,
    profile: any,
  ): Promise<Omit<User, 'password'>> {
    const email =
      profile.emails && profile.emails.length > 0
        ? profile.emails[0].value
        : null;
    const displayName =
      profile.displayName ||
      (profile.name
        ? `${profile.name.givenName} ${profile.name.familyName}`
        : null);
    const oauthId = profile.id;
    const user = await this.userService.findOrCreateOAuthUser(
      provider,
      oauthId,
      email,
      displayName,
    );
    const { password, ...result } = user;
    return result;
  }
}
