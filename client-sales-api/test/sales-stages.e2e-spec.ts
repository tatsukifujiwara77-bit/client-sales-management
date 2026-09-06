import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('SalesStages / Pipeline (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /sales-stages requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer()).get('/sales-stages').expect(401);
  });

  it('GET /clients/pipeline requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer()).get('/clients/pipeline').expect(401);
  });
});
