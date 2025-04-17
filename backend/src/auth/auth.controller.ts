import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Res,
  Request,
  Body,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request as ExpressRequest } from 'express';
import { RegisterUserDto } from './auth.dto';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    id: number;
    username: string;
    role: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /** ------------------------------------------------------------------
   *  Utilitaire privé : sécurise et sélectionne l’URL de redirection
   *  ------------------------------------------------------------------ */
  private resolveRedirectUri(requested?: string): string {
    const allowed = this.configService
      .get<string>('ALLOWED_REDIRECT_URLS')!
      .split(',')
      .map((u) => u.trim());

    if (requested && allowed.includes(requested)) {
      return requested;
    }
    return allowed[0]; // fallback sécurisé
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: AuthenticatedRequest) {
    // req.user contient désormais id, username ET role
    return this.authService.login(req.user);
  }

  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.register(registerUserDto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(): Promise<void> {
    // Redirection vers Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<any> {
    const token = await this.authService.login(req.user);
    const redirectUri = this.resolveRedirectUri(
      (req.query.redirect_uri as string) || undefined,
    );
    return res.redirect(
      `${redirectUri}?token=${encodeURIComponent(token.access_token)}`,
    );
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth(): Promise<void> {
    // Redirection vers Facebook
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuthRedirect(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<any> {
    const token = await this.authService.login(req.user);
    const redirectUri = this.resolveRedirectUri(
      (req.query.redirect_uri as string) || undefined,
    );
    return res.redirect(
      `${redirectUri}?token=${encodeURIComponent(token.access_token)}`,
    );
  }
}
