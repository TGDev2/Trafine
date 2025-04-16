/**
 * JWT WebSocket Guard
 *
 * Ce guard vérifie le token JWT transmis via la propriété "auth" du handshake du WebSocket.
 * Si le token est valide, le payload est stocké dans client.data.user pour d'éventuels contrôles ultérieurs.
 * En cas d'erreur, une exception est levée empêchant ainsi la connexion.
 */

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class JwtWsGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    // Extraction du token du handshake (format attendu : "Bearer <token>")
    const token = client.handshake.auth?.token?.split(' ')[1];
    
    try {
      const payload = this.jwtService.verify(token);
      // Stockage du payload dans le socket pour une utilisation ultérieure dans le contexte WebSocket
      client.data.user = payload;
      return true;
    } catch (e) {
      throw new WsException('Unauthorized');
    }
  }
}
