/**
 * JWT WebSocket Guard
 *
 * - Vérifie le token JWT transmis dans `client.handshake.auth.token`
 *   (accepte « Bearer <token> » ou le token nu).
 * - En cas de succès, renseigne `client.data.user` au format attendu
 *   par `AlertsGateway { userId, username, role }`.
 */

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

interface JwtPayload {
  sub: number;
  username: string;
  role: string;
}

@Injectable()
export class JwtWsGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();

    /* --------------------------------------------------------------
     *  Extraction permissive du token :
     *    - auth.token = "Bearer <jwt>"
     *    - auth.token = "<jwt>"
     * -------------------------------------------------------------*/
    const raw = client.handshake.auth?.token;
    if (!raw || typeof raw !== 'string') throw new WsException('Unauthorized');

    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);

      // Mise au format attendu par AlertsGateway → user.userId
      client.data.user = {
        userId: payload.sub,
        username: payload.username,
        role: payload.role,
      };
      return true;
    } catch {
      throw new WsException('Unauthorized');
    }
  }
}
