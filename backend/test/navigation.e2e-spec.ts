import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Navigation API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/navigation/calculate (POST) should calculate the route correctly', async () => {
    const response = await request(app.getHttpServer())
      .post('/navigation/calculate')
      .send({
        source: '48.8566, 2.3522', // Coordonnées pour Paris
        destination: '45.7640, 4.8357', // Coordonnées pour Lyon
        avoidTolls: true,
      })
      .expect(200);

    const body = response.body;
    expect(body).toHaveProperty('source', '48.8566, 2.3522');
    expect(body).toHaveProperty('destination', '45.7640, 4.8357');
    expect(body).toHaveProperty('distance');
    expect(body).toHaveProperty('duration');
    expect(body).toHaveProperty('instructions');
    expect(Array.isArray(body.instructions)).toBe(true);
    expect(body).toHaveProperty('avoidTolls', true);
    expect(typeof body.recalculated).toBe('boolean');
  });

  it('/navigation/share (POST) should generate a valid QR code', async () => {
    const response = await request(app.getHttpServer())
      .post('/navigation/share')
      .send({
        source: '48.8566, 2.3522',
        destination: '45.7640, 4.8357',
        avoidTolls: false,
      })
      .expect(200);

    const body = response.body;
    expect(body).toHaveProperty('qrCode');
    expect(typeof body.qrCode).toBe('string');
    expect(body.qrCode.startsWith('data:image')).toBe(true);
  });
});
