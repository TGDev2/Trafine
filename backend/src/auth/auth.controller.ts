import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Res,
  Body,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';

interface AuthenticatedRequest extends ExpressRequest {
  user: { id: number; username: string; role: string };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /* ----------  Helpers  ---------- */
  private resolveRedirectUri(requested?: string): string {
    const allowed = this.configService
      .get<string>('ALLOWED_REDIRECT_URLS')!
      .split(',')
      .map((u) => u.trim());

    if (requested && allowed.includes(requested)) return requested;
    return allowed[0];
  }

  /* ----------  Login / Register (local)  ---------- */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: AuthenticatedRequest) {
    return this.authService.login(req.user);
  }

  @Post('register')
  async register(@Body() body: { username: string; password: string }) {
    return this.authService.register(body);
  }

  /* ----------  OAuth Google ---------- */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(): Promise<void> {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const tokens = await this.authService.login(req.user);
    const redirectUri = this.resolveRedirectUri(
      (req.query.redirect_uri as string) || undefined,
    );
    return res.redirect(
      `${redirectUri}?token=${encodeURIComponent(
        tokens.access_token,
      )}&refreshToken=${encodeURIComponent(tokens.refresh_token)}`,
    );
  }

  /* ----------  OAuth Facebook ---------- */
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth(): Promise<void> {}

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookCallback(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const tokens = await this.authService.login(req.user);
    const redirectUri = this.resolveRedirectUri(
      (req.query.redirect_uri as string) || undefined,
    );
    return res.redirect(
      `${redirectUri}?token=${encodeURIComponent(
        tokens.access_token,
      )}&refreshToken=${encodeURIComponent(tokens.refresh_token)}`,
    );
  }

  /* ----------  Refresh & Logout ---------- */
  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: AuthenticatedRequest) {
    await this.authService.logout(req.user.id);
    return { ok: true };
  }
}
