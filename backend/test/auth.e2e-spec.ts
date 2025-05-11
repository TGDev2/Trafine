import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should register a new user', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: 'testuser123',
        password: 'testpass123',
      })
      .expect(201);

    expect(response.body).toHaveProperty('access_token');
  });

  it('should login existing user', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'testuser123',
        password: 'testpass123',
      })
      .expect(200);

    expect(response.body).toHaveProperty('access_token');
  });

  it('should reject invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'testuser123',
        password: 'wrongpassword',
      })
      .expect(401);
  });
});