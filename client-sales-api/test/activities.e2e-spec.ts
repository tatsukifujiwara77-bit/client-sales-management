import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

const CLIENT_ID = '00000000-0000-0000-0000-000000000000';

describe('ActivitiesController (e2e)', () => {
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

  it('GET /clients/:id/activities requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer()).get(`/clients/${CLIENT_ID}/activities`).expect(401);
  });

  it('POST /clients/:id/activities requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer())
      .post(`/clients/${CLIENT_ID}/activities`)
      .send({ activityType: 'visit', activityDate: '2026-05-20' })
      .expect(401);
  });
});
