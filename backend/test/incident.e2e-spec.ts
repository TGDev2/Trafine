import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

jest.setTimeout(30000);

describe('Incident API (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;
  let createdIncidentId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Création d'un utilisateur de test afin d'obtenir un token JWT
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: 'testuser', password: 'testpassword' });
    jwtToken = registerResponse.body.access_token;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should create an incident', async () => {
    const incidentPayload = {
      type: 'accident',
      description: 'Test accident incident',
      latitude: 48.8566,
      longitude: 2.3522,
    };

    const createResponse = await request(app.getHttpServer())
      .post('/incidents')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send(incidentPayload)
      .expect(201);

    expect(createResponse.body).toHaveProperty('id');
    expect(createResponse.body.type).toBe(incidentPayload.type);
    createdIncidentId = createResponse.body.id;
  });

  it('should get list of incidents', async () => {
    const response = await request(app.getHttpServer())
      .get('/incidents')
      .expect(200);

    expect(Array.isArray(response.body)).toBeTruthy();
    const incident = response.body.find(
      (inc: any) => inc.id === createdIncidentId,
    );
    expect(incident).toBeDefined();
  });

  it('should confirm an incident', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/incidents/${createdIncidentId}/confirm`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('id', createdIncidentId);
    expect(response.body.confirmed).toBe(true);
    expect(response.body.denied).toBe(false);
  });

  it('should deny an incident', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/incidents/${createdIncidentId}/deny`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('id', createdIncidentId);
    expect(response.body.denied).toBe(true);
    expect(response.body.confirmed).toBe(false);
  });
});
