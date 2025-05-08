import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  /* --------  VALIDATION CREDENTIALS (local strategy)  -------- */
  async validateUser(
    username: string,
    password: string,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.userService.findByUsername(username);
    if (!user || !(await this.userService.verifyPassword(user, password))) {
      throw new UnauthorizedException(
        'Nom d’utilisateur ou mot de passe incorrect',
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _ignored, ...safe } = user;
    return safe;
  }

  /* --------  TOKEN PAIR GENERATION  -------- */
  private async signTokenPair(payload: {
    sub: number;
    username: string;
    role: string;
  }): Promise<{ access_token: string; refresh_token: string }> {
    const access_token = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Stockage du hash côté serveur (révocation possible)
    await this.userService.setRefreshToken(payload.sub, refresh_token);
    return { access_token, refresh_token };
  }

  /* --------  LOGIN / REGISTER / OAUTH  -------- */
  async login(user: Pick<User, 'id' | 'username' | 'role'>) {
    return this.signTokenPair({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
  }

  async register(dto: { username: string; password: string }) {
    const newUser = await this.userService.createUser(
      dto.username,
      dto.password,
    );
    return this.login({
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
    });
  }

  async validateOAuthLogin(provider: string, profile: any) {
    // Validation du fournisseur OAuth
    if (!['google'].includes(provider)) {
      throw new Error('Fournisseur OAuth non supporté');
    }

    // Extraction et validation de l'email
    const email = profile.emails?.[0]?.value?.toLowerCase();
    if (email && !email.match(/^[^@]+@[^@]+\.[^@]+$/)) {
      throw new Error('Format d\'email invalide');
    }

    // Construction du nom d'affichage sécurisé
    const displayName = (
      profile.displayName ||
      (profile.name
        ? `${profile.name.givenName} ${profile.name.familyName}`
        : null)
    )?.slice(0, 100); // Limite la longueur pour éviter les attaques par dépassement

    // Validation de l'ID OAuth
    if (!profile.id || typeof profile.id !== 'string') {
      throw new Error('ID OAuth invalide');
    }

    // Création ou récupération de l'utilisateur avec les données validées
    const user = await this.userService.findOrCreateOAuthUser(
      provider,
      profile.id,
      email,
      displayName,
    );

    // On ne renvoie jamais le mot de passe
    const { password, refreshTokenHash, ...safe } = user;
    return safe;
  }

  /* --------  REFRESH FLOW  -------- */
  async refresh(refreshToken: string) {
    if (!refreshToken) throw new BadRequestException('Refresh token required');

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    const user = await this.userService.findById(payload.sub);
    if (!user || !user.refreshTokenHash) throw new UnauthorizedException();

    const tokenMatch = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash,
    );
    if (!tokenMatch) throw new UnauthorizedException();

    return this.signTokenPair({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
  }

  /* --------  LOGOUT  -------- */
  async logout(userId: number): Promise<void> {
    await this.userService.removeRefreshToken(userId);
  }
}
