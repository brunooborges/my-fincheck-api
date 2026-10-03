import { Controller, Get, Post } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as request from 'supertest';

import { HealthController } from 'src/modules/health/health.controller';
import { configureApp } from '../config/configure-app';
import {
  DEFAULT_LIMITS,
  ThrottlingLimits,
  ThrottlingModule,
} from './throttling.module';

const ORIGIN = 'https://brunooborges.github.io';
const HOUR = 60 * 60 * 1000;

@Controller()
class DemoController {
  @Get('items')
  list() {
    return [];
  }

  @Get('other')
  other() {
    return [];
  }

  @Post('items')
  create() {
    return { ok: true };
  }

  @Post('auth/signup')
  signup() {
    return { ok: true };
  }

  @Post('auth/signin')
  signin() {
    return { ok: true };
  }
}

const GENEROUS: ThrottlingLimits = {
  general: { limit: 1000, ttl: HOUR },
  writes: { limit: 1000, ttl: HOUR },
  signup: { limit: 1000, ttl: HOUR },
  signin: { limit: 1000, ttl: HOUR },
};

async function createApp(
  limits: Partial<ThrottlingLimits>,
): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [ThrottlingModule.forRoot({ ...GENEROUS, ...limits })],
    controllers: [DemoController, HealthController],
    providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app, { allowedOrigins: [ORIGIN], trustProxy: 1 });
  await app.init();
  return app;
}

function hasRetryAfter(headers: Record<string, string>): boolean {
  return Object.keys(headers).some((name) => name.startsWith('retry-after'));
}

describe('throttling', () => {
  let app: NestExpressApplication;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('has sensible defaults: generous for reading, tight for writes, tightest for sign-up', () => {
    expect(DEFAULT_LIMITS.general.limit).toBeGreaterThanOrEqual(60);
    expect(DEFAULT_LIMITS.writes.limit).toBeLessThanOrEqual(30);
    expect(DEFAULT_LIMITS.signup.limit).toBeLessThanOrEqual(10);
    expect(DEFAULT_LIMITS.signup.ttl).toBeGreaterThanOrEqual(HOUR);
    expect(DEFAULT_LIMITS.signin.limit).toBeGreaterThan(
      DEFAULT_LIMITS.signup.limit,
    );
  });

  it('answers 429 with a Retry-After once a visitor spends the general budget', async () => {
    app = await createApp({ general: { limit: 3, ttl: HOUR } });
    const server = app.getHttpServer();

    for (let i = 0; i < 3; i += 1) {
      expect((await request(server).get('/items')).status).toBe(200);
    }
    const blocked = await request(server).get('/items');

    expect(blocked.status).toBe(429);
    expect(hasRetryAfter(blocked.headers)).toBe(true);
  });

  it('counts one budget per visitor across routes, not one per route', async () => {
    app = await createApp({ general: { limit: 3, ttl: HOUR } });
    const server = app.getHttpServer();

    await request(server).get('/items');
    await request(server).get('/other');
    await request(server).get('/items');

    expect((await request(server).get('/other')).status).toBe(429);
  });

  it('counts visitors separately by their real address behind the proxy', async () => {
    app = await createApp({ general: { limit: 1, ttl: HOUR } });
    const server = app.getHttpServer();

    const first = await request(server)
      .get('/items')
      .set('X-Forwarded-For', '203.0.113.1');
    const again = await request(server)
      .get('/items')
      .set('X-Forwarded-For', '203.0.113.1');
    const other = await request(server)
      .get('/items')
      .set('X-Forwarded-For', '203.0.113.2');

    expect(first.status).toBe(200);
    expect(again.status).toBe(429);
    expect(other.status).toBe(200);
  });

  it('keeps the browser able to read the 429, so the demo can show a friendly message', async () => {
    app = await createApp({ general: { limit: 1, ttl: HOUR } });
    const server = app.getHttpServer();
    await request(server).get('/items').set('Origin', ORIGIN);

    const blocked = await request(server).get('/items').set('Origin', ORIGIN);

    expect(blocked.status).toBe(429);
    expect(blocked.headers['access-control-allow-origin']).toBe(ORIGIN);
  });

  it('holds writes to a tighter budget than reads, and reads do not spend it', async () => {
    app = await createApp({ writes: { limit: 2, ttl: HOUR } });
    const server = app.getHttpServer();

    for (let i = 0; i < 5; i += 1) {
      expect((await request(server).get('/items')).status).toBe(200);
    }
    expect((await request(server).post('/items').send({})).status).toBe(201);
    expect((await request(server).post('/items').send({})).status).toBe(201);
    expect((await request(server).post('/items').send({})).status).toBe(429);
    expect((await request(server).get('/items')).status).toBe(200);
  });

  it('limits sign-ups hardest, without touching anything else', async () => {
    app = await createApp({ signup: { limit: 2, ttl: HOUR } });
    const server = app.getHttpServer();

    expect((await request(server).post('/auth/signup').send({})).status).toBe(
      201,
    );
    expect((await request(server).post('/auth/signup').send({})).status).toBe(
      201,
    );
    expect((await request(server).post('/auth/signup').send({})).status).toBe(
      429,
    );

    expect((await request(server).post('/auth/signin').send({})).status).toBe(
      201,
    );
    expect((await request(server).get('/items')).status).toBe(200);
  });

  it('limits sign-in attempts separately from sign-ups', async () => {
    app = await createApp({ signin: { limit: 3, ttl: HOUR } });
    const server = app.getHttpServer();

    for (let i = 0; i < 3; i += 1) {
      expect((await request(server).post('/auth/signin').send({})).status).toBe(
        201,
      );
    }
    expect((await request(server).post('/auth/signin').send({})).status).toBe(
      429,
    );
    expect((await request(server).post('/auth/signup').send({})).status).toBe(
      201,
    );
  });

  it('never limits /health, and does not let it eat the visitor budget', async () => {
    app = await createApp({
      general: { limit: 2, ttl: HOUR },
      writes: { limit: 2, ttl: HOUR },
    });
    const server = app.getHttpServer();

    for (let i = 0; i < 10; i += 1) {
      expect((await request(server).get('/health')).status).toBe(200);
    }

    expect((await request(server).get('/items')).status).toBe(200);
  });
});
