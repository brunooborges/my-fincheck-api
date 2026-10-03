import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

// Only the environment and the database are stubbed: the rest is the real application wiring.
jest.mock('src/shared/config/env', () => ({
  env: { jwtSecret: 'integration-test-secret', dbURL: 'postgresql://unused' },
}));

import { AppModule } from './app.module';
import { configureApp } from './shared/config/configure-app';
import { readServerConfig } from './shared/config/server-config';
import { PrismaService } from './shared/database/prisma.service';

const ORIGIN = 'https://brunooborges.github.io';

describe('the application, as wired for production', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app, readServerConfig({}));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers /health without a login, for the front end wake-up check', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('X-Forwarded-For', '198.51.100.1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('still requires a login everywhere else', async () => {
    const response = await request(app.getHttpServer())
      .get('/bank-accounts')
      .set('X-Forwarded-For', '198.51.100.2');

    expect(response.status).toBe(401);
  });

  it('turns a flood away before it reaches the login check', async () => {
    const server = app.getHttpServer();
    const statuses: number[] = [];

    for (let i = 0; i < 22; i += 1) {
      const response = await request(server)
        .post('/bank-accounts')
        .set('X-Forwarded-For', '198.51.100.3')
        .send({});
      statuses.push(response.status);
    }

    expect(statuses.slice(0, 20).every((status) => status === 401)).toBe(true);
    expect(statuses.slice(20)).toEqual([429, 429]);
  });

  it('allows only a handful of sign-ups per visitor, even when each one is invalid', async () => {
    const server = app.getHttpServer();
    const statuses: number[] = [];

    for (let i = 0; i < 7; i += 1) {
      const response = await request(server)
        .post('/auth/signup')
        .set('X-Forwarded-For', '198.51.100.4')
        .send({});
      statuses.push(response.status);
    }

    expect(statuses).toEqual([400, 400, 400, 400, 400, 429, 429]);
  });

  it('limits sign-in attempts too', async () => {
    const server = app.getHttpServer();
    const statuses: number[] = [];

    for (let i = 0; i < 12; i += 1) {
      const response = await request(server)
        .post('/auth/signin')
        .set('X-Forwarded-For', '198.51.100.5')
        .send({});
      statuses.push(response.status);
    }

    expect(statuses.slice(0, 10).every((status) => status === 400)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });

  it('keeps /health working for a visitor who has been rate-limited', async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < 7; i += 1) {
      await request(server)
        .post('/auth/signup')
        .set('X-Forwarded-For', '198.51.100.6')
        .send({});
    }

    const response = await request(server)
      .get('/health')
      .set('X-Forwarded-For', '198.51.100.6');

    expect(response.status).toBe(200);
  });

  it('does not count different visitors together', async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < 7; i += 1) {
      await request(server)
        .post('/auth/signup')
        .set('X-Forwarded-For', '198.51.100.7')
        .send({});
    }

    const other = await request(server)
      .post('/auth/signup')
      .set('X-Forwarded-For', '198.51.100.8')
      .send({});

    expect(other.status).toBe(400);
  });

  it('lets the browser read a 429 from the hosted front end, and no other site', async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < 5; i += 1) {
      await request(server)
        .post('/auth/signup')
        .set('X-Forwarded-For', '198.51.100.9')
        .send({});
    }

    const fromFrontEnd = await request(server)
      .post('/auth/signup')
      .set('X-Forwarded-For', '198.51.100.9')
      .set('Origin', ORIGIN)
      .send({});
    const fromElsewhere = await request(server)
      .post('/auth/signup')
      .set('X-Forwarded-For', '198.51.100.9')
      .set('Origin', 'https://evil.example')
      .send({});

    expect(fromFrontEnd.status).toBe(429);
    expect(fromFrontEnd.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(
      fromElsewhere.headers['access-control-allow-origin'],
    ).toBeUndefined();
  });
});
