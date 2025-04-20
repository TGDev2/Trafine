import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import { Incident } from '../src/incident/incident.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IncidentService } from '../src/incident/incident.service';

jest.setTimeout(30000);

describe('Incident API (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;
  let createdIncidentId: number;
  let incidentRepository: Repository<Incident>;
  let incidentService: IncidentService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    incidentRepository = moduleFixture.get<Repository<Incident>>(
      getRepositoryToken(Incident),
    );
    incidentService = moduleFixture.get<IncidentService>(IncidentService);

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

  it('should archive an incident as admin', async () => {
    // Authentification admin (identifiants seedés)
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin' });
    const adminToken = adminLogin.body.access_token;
    expect(adminToken).toBeDefined();

    // Archiver l’incident créé précédemment
    const res = await request(app.getHttpServer())
      .patch(`/incidents/${createdIncidentId}/archive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('status', 'archived');
  });

  it('should automatically expire old incidents', async () => {
    // Création d'un incident avec une date d'expiration passée
    const expiredIncident = await incidentRepository.save({
      type: 'test-expired',
      description: 'Incident expiré pour test',
      location: { type: 'Point', coordinates: [0, 0] },
      expirationDate: new Date(Date.now() - 10000), // 10 secondes dans le passé
      status: 'active' as 'active',
      createdAt: new Date(),
      confirmed: false,
      denied: false,
      votes: [],
    });
  
    // Déclenchement manuel du nettoyage
    await incidentService.cleanExpiredIncidents();
  
    const updatedIncident = await incidentRepository.findOneBy({ id: expiredIncident.id });
    expect(updatedIncident).not.toBeNull(); // Vérifie que l'incident existe
    if (updatedIncident) {
      expect(updatedIncident.status).toBe('expired');
    }
  });  
});
