import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

const CLIENT_ID = '00000000-0000-0000-0000-000000000000';
const ALERT_ID = '11111111-1111-1111-1111-111111111111';

describe('Alerts / AlertSettings (e2e)', () => {
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

  it('GET /alerts requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer()).get('/alerts').expect(401);
  });

  it('GET /clients/:id/alerts requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer()).get(`/clients/${CLIENT_ID}/alerts`).expect(401);
  });

  it('PATCH /alerts/:id requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer()).patch(`/alerts/${ALERT_ID}`).send({ status: 'dismissed' }).expect(401);
  });

  it('POST /alerts/recompute requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer()).post('/alerts/recompute').expect(401);
  });

  it('GET /alert-settings requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer()).get('/alert-settings').expect(401);
  });
});
