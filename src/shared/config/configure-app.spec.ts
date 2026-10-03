import { Body, Controller, Get, Post } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { IsString } from 'class-validator';
import * as request from 'supertest';

import { configureApp } from './configure-app';

const ORIGIN = 'https://brunooborges.github.io';

class CreateItemDto {
  @IsString()
  name: string;
}

@Controller('items')
class ItemsController {
  @Get()
  list() {
    return [{ id: '1' }];
  }

  @Post()
  create(@Body() dto: CreateItemDto) {
    return dto;
  }
}

describe('configureApp', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ItemsController],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app, {
      allowedOrigins: [ORIGIN, 'http://localhost:5173'],
      trustProxy: 1,
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets the configured front end read the API from a browser', async () => {
    const response = await request(app.getHttpServer())
      .get('/items')
      .set('Origin', ORIGIN);

    expect(response.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(response.headers['vary']).toMatch(/Origin/i);
  });

  it('does not let any other site read it', async () => {
    const response = await request(app.getHttpServer())
      .get('/items')
      .set('Origin', 'https://evil.example');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers the preflight request with explicit methods and headers, including the login token', async () => {
    const response = await request(app.getHttpServer())
      .options('/items')
      .set('Origin', ORIGIN)
      .set('Access-Control-Request-Method', 'PUT')
      .set('Access-Control-Request-Headers', 'authorization,content-type');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(response.headers['access-control-allow-methods']).toMatch(/PUT/);
    expect(response.headers['access-control-allow-methods']).toMatch(/DELETE/);
    expect(response.headers['access-control-allow-headers']).toMatch(
      /Authorization/i,
    );
    expect(response.headers['access-control-allow-headers']).toMatch(
      /Content-Type/i,
    );
  });

  it('still validates request bodies', async () => {
    const bad = await request(app.getHttpServer()).post('/items').send({});
    const good = await request(app.getHttpServer())
      .post('/items')
      .send({ name: 'Rent' });

    expect(bad.status).toBe(400);
    expect(good.status).toBe(201);
  });

  it('rejects a body over 10 kb with 413', async () => {
    const response = await request(app.getHttpServer())
      .post('/items')
      .send({ name: 'x'.repeat(11 * 1024) });

    expect(response.status).toBe(413);
  });

  it('does not advertise the framework', async () => {
    const response = await request(app.getHttpServer()).get('/items');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
