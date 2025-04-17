import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import type { Feature, LineString } from 'geojson';
import { Incident } from '../incident/incident.entity';
import { JwtWsGuard } from '../auth/jwt-ws.guard';
import { isIncidentNearRoute } from './route.utils';

interface RouteSubscription {
  route: Feature<LineString>;
  threshold: number;
}

@WebSocketGateway({
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : '*',
  },
})
@UseGuards(JwtWsGuard)
export class AlertsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly subscriptions = new Map<string, RouteSubscription>();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.subscriptions.delete(client.id);
    console.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Le client s'abonne avec sa géométrie de route :
   * { geometry: Feature<LineString>, threshold?: number }
   */
  @SubscribeMessage('subscribeRoute')
  handleSubscribeRoute(
    client: Socket,
    payload: { geometry: Feature<LineString>; threshold?: number },
  ) {
    try {
      // Vérifier que la géométrie est bien un LineString
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

  /**
   * On n'alerte que les sockets dont la route passe à ≤ threshold
   * de l'incident. Les non‑abonnés restent en diffusion globale.
   */
  broadcastIncidentAlert(incident: Incident) {
    for (const [id, socket] of this.server.sockets.sockets) {
      const sub = this.subscriptions.get(id);
      if (!sub || isIncidentNearRoute(sub.route, incident, sub.threshold)) {
        socket.emit('incidentAlert', incident);
      }
    }
  }
}
