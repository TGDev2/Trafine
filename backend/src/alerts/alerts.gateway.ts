import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import type { Feature, LineString } from 'geojson';
import { JwtService } from '@nestjs/jwt';
import { Incident } from '../incident/incident.entity';
import { JwtWsGuard } from '../auth/jwt-ws.guard';
import { isIncidentNearRoute } from './route.utils';
import { RouteResult } from '../navigation/route-calculation.strategy';

interface RouteSubscription {
  route: Feature<LineString>;
  threshold: number;
}

@WebSocketGateway()
@UseGuards(JwtWsGuard)
export class AlertsGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly log = new Logger(AlertsGateway.name);

  private readonly subscriptions = new Map<string, RouteSubscription>();
  private readonly userSockets = new Map<number, Set<string>>();

  constructor(private readonly jwt: JwtService) { }

  /* ------------------------------------------------------------------
   *  Connexion / Déconnexion
   * -----------------------------------------------------------------*/
  handleConnection(client: Socket) {
    /* ------------------------  CORS  ------------------------ */
    const allowed =
      process.env.ALLOWED_WEB_ORIGINS?.split(',').map((u) => u.trim()) || [];
    const origin = client.handshake.headers.origin;
    if (
      process.env.NODE_ENV === 'production' &&
      origin &&
      !allowed.includes(origin)
    ) {
      client.disconnect(true);
      return;
    }

    /* ---------------------  Auth JWT  ----------------------- */
    const raw = client.handshake.auth?.token as string | undefined
      || (client.handshake as any)?.query?.token                 // fallback ?token=...
      || client.handshake.headers.authorization as string | undefined;

    const token = raw?.startsWith('Bearer ') ? raw.slice(7) : raw;

    if (token) {
      try {
        const payload = this.jwt.verify<{
          sub: number;
          username: string;
          role: string;
        }>(token);

        /* Stockage dans `client.data.user` pour les events gardés */
        client.data.user = {
          userId: payload.sub,
          username: payload.username,
          role: payload.role,
        };

        /* Mapping userId ⇆ socket (multi-device support) */
        const set = this.userSockets.get(payload.sub) ?? new Set<string>();
        set.add(client.id);
        this.userSockets.set(payload.sub, set);
        this.log.debug(`Socket ${client.id} mapped to user ${payload.sub}`);
      } catch {
        // JWT invalide → pas de mapping. Les events protégés seront bloqués
      }
    }

    this.log.debug(`Client connecté: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.subscriptions.delete(client.id);

    /* Nettoyage du mapping utilisateur */
    for (const [uid, set] of this.userSockets.entries()) {
      if (set.delete(client.id) && set.size === 0) {
        this.userSockets.delete(uid);
      }
    }

    this.log.debug(`Client déconnecté: ${client.id}`);
  }

  /* ------------------------------------------------------------------
   *  Abonnement à la géométrie de route
   * -----------------------------------------------------------------*/
  @SubscribeMessage('subscribeRoute')
  handleSubscribeRoute(
    client: Socket,
    payload: { geometry: Feature<LineString>; threshold?: number },
  ) {
    try {
      if (
        !payload.geometry ||
        payload.geometry.geometry.type !== 'LineString'
      ) {
        throw new Error('Invalid geometry: expected Feature<LineString>');
      }
      const threshold = Number(payload.threshold) || 500;
      this.subscriptions.set(client.id, {
        route: payload.geometry,
        threshold,
      });
      client.emit('subscribedRoute', { ok: true });
    } catch (err: any) {
      client.emit('subscribedRoute', { ok: false, error: err.message });
    }
  }

  /* ------------------------------------------------------------------
   *  Diffusion des alertes incidents
   * -----------------------------------------------------------------*/
  broadcastIncidentAlert(incident: Incident) {
    for (const [id, socket] of this.server.sockets.sockets) {
      const sub = this.subscriptions.get(id);
      if (!sub || isIncidentNearRoute(sub.route, incident, sub.threshold)) {
        socket.emit('incidentAlert', incident);
      }
    }
  }

  /* ------------------------------------------------------------------
   *  Partage d’itinéraire à un utilisateur
   * -----------------------------------------------------------------*/
  sendRouteToUser(userId: number, routes: RouteResult[]): void {
    const sockIds = this.userSockets.get(userId);
    if (!sockIds?.size) {
      this.log.warn(
        `Aucun socket actif pour l’utilisateur ${userId} – itinéraire non poussé.`,
      );
      return;
    }
    for (const id of sockIds) {
      this.server.sockets.sockets.get(id)?.emit('routeShared', { routes });
    }
    this.log.debug(
      `Itinéraire partagé à l’utilisateur ${userId} sur ${sockIds.size} socket(s)`,
    );
  }
}
