import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';
import { RegisterUserDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

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
   * Génère un token JWT incluant id, username et rôle.
   */
  login(user: Pick<User, 'id' | 'username' | 'role'>): {
    access_token: string;
  } {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(
    registerUserDto: RegisterUserDto,
  ): Promise<{ access_token: string }> {
    const newUser = await this.userService.createUser(
      registerUserDto.username,
      registerUserDto.password,
    );
    // On inclut désormais newUser.role (par défaut 'user')
    return this.login({
      username: newUser.username,
      id: newUser.id,
      role: newUser.role,
    });
  }

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
