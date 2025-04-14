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

  it('/navigation/calculate (POST) should calculate alternative routes correctly', async () => {
    const response = await request(app.getHttpServer())
      .post('/navigation/calculate')
      .send({
        source: '48.8566, 2.3522',
        destination: '45.7640, 4.8357',
        avoidTolls: true,
      })
      .expect(200);

    const body = response.body;
    expect(body).toHaveProperty('routes');
    expect(Array.isArray(body.routes)).toBe(true);
    expect(body.routes.length).toBeGreaterThanOrEqual(1);
    for (const route of body.routes) {
      expect(route).toHaveProperty('source', '48.8566, 2.3522');
      expect(route).toHaveProperty('destination', '45.7640, 4.8357');
      expect(route).toHaveProperty('distance');
      expect(route).toHaveProperty('duration');
      expect(route).toHaveProperty('instructions');
      expect(Array.isArray(route.instructions)).toBe(true);
      expect(route).toHaveProperty('avoidTolls', true);
      expect(typeof route.recalculated).toBe('boolean');
    }
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
