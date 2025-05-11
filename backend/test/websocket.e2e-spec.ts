import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Socket as ClientSocket, connect } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';

describe('WebSocket Gateway (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let socket: typeof ClientSocket;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    httpServer = createServer(app.getHttpServer());
    await app.init();
    httpServer.listen();

    const address = httpServer.address() as AddressInfo;
    socket = connect(`http://localhost:${address.port}`, {
      autoConnect: false,
      transports: ['websocket'],
    });
  });

  afterAll(async () => {
    socket.close();
    httpServer.close();
    await app.close();
  });

  it('should connect to websocket server', (done) => {
    socket.connect();

    socket.on('connect', () => {
      expect(socket.connected).toBeTruthy();
      done();
    });
  });

  it('should receive incident updates', (done) => {
    socket.on('incidentUpdate', (data: { type: string; location: any }) => {
      expect(data).toHaveProperty('type');
      expect(data).toHaveProperty('location');
      done();
    });

    // Simuler un nouvel incident
    socket.emit('newIncident', {
      type: 'accident',
      latitude: 48.8566,
      longitude: 2.3522,
    });
  });
});