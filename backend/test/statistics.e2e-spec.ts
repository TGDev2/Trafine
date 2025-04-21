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
});
