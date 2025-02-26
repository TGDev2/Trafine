import {
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  Req,
  Res
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  /**
   * Initiation de la connexion Google
   * On utilise 'AuthGuard('google')' qui va rediriger vers la page de login Google
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
  }

  /**
   * Callback une fois que Google a validé l'utilisateur
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    const user = req.user;

    const token = await this.authService.login(user);

    return res.redirect(`http://localhost:3001?token=${token.access_token}`);
  }
}
