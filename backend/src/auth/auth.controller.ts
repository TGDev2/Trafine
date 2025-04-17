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
  constructor(private authService: AuthService) {}

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
    return res.redirect(`http://localhost:3001?token=${token.access_token}`);
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
    return res.redirect(`http://localhost:3001?token=${token.access_token}`);
  }
}
