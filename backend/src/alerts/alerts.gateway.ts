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
export class AlertsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly log = new Logger(AlertsGateway.name);

  private readonly subscriptions = new Map<string, RouteSubscription>();
  private readonly userSockets = new Map<number, Set<string>>();

  /* ------------------------------------------------------------------
   *  Connexion / Déconnexion
   * -----------------------------------------------------------------*/
  handleConnection(client: Socket) {
    /* CORS strict en production */
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

    /* Mapping userId ⇆ socket */
    const user = (client.data as any)?.user;
    if (user?.userId) {
      const set = this.userSockets.get(user.userId) ?? new Set<string>();
      set.add(client.id);
      this.userSockets.set(user.userId, set);
      this.log.debug(`Socket ${client.id} mapped to user ${user.userId}`);
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
   *  **NOUVEAU** : partage d’itinéraire à un utilisateur
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
