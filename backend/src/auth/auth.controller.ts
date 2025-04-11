import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Res,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    username: string;
    id: number;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Request() req: AuthenticatedRequest,
  ): Promise<{ access_token: string }> {
    return this.authService.login(req.user);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(): Promise<void> {
    // Point de redirection vers Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<any> {
    // Nous assurons ici que req.user est typé correctement
    const user = req.user;
    const token = await this.authService.login(user);
    return res.redirect(`http://localhost:3001?token=${token.access_token}`);
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth(): Promise<void> {
    // Point de redirection vers Facebook
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuthRedirect(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<any> {
    const user = req.user;
    const token = await this.authService.login(user);
    return res.redirect(`http://localhost:3001?token=${token.access_token}`);
  }
}
