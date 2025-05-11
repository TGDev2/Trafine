import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Statistics prediction (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    /* Auth utilisateur de test */
    const { body } = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: 'statuser', password: 'statpass' });

    token = body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/statistics/prediction should return level & count', async () => {
    const res = await request(app.getHttpServer())
      .get('/statistics/prediction')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty('congestionLevel');
    expect(res.body).toHaveProperty('incidentCount');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('should return historical statistics', async () => {
    const res = await request(app.getHttpServer())
      .get('/statistics/history')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body[0]).toHaveProperty('timestamp');
    expect(res.body[0]).toHaveProperty('incidentCount');
  });

  it('should return current day statistics', async () => {
    const res = await request(app.getHttpServer())
      .get('/statistics/today')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty('date');
    expect(res.body).toHaveProperty('totalIncidents');
    expect(res.body).toHaveProperty('confirmedIncidents');
  });
});
