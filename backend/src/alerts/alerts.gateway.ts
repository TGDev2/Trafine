/**
 * AlertsGateway
 *
 * Cette passerelle WebSocket gère les connexions des clients et diffuse des alertes concernant les incidents en temps réel.
 * Le guard JwtWsGuard est appliqué pour sécuriser la connexion et empêcher l’accès par des clients non authentifiés.
 */

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { Incident } from '../incident/incident.entity';
import { JwtWsGuard } from '../auth/jwt-ws.guard';

@WebSocketGateway({
  cors: {
    // En production, définir explicitement les origines autorisées.
    origin: process.env.NODE_ENV === 'production' ? false : '*',
  },
})
@UseGuards(JwtWsGuard)
export class AlertsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Diffuse une alerte concernant un incident vers tous les clients connectés.
   * @param incident L'incident à diffuser
   */
  broadcastIncidentAlert(incident: Incident) {
    this.server.emit('incidentAlert', incident);
  }
}
