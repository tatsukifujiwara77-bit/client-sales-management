import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('ClientsController (e2e)', () => {
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

  it('GET /clients requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer()).get('/clients').expect(401);
  });

  it('GET /clients/:id requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer())
      .get('/clients/00000000-0000-0000-0000-000000000000')
      .expect(401);
  });

  it('POST /clients requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer())
      .post('/clients')
      .send({ companyName: 'テスト株式会社', officeId: '00000000-0000-0000-0000-000000000000', salesStageId: '00000000-0000-0000-0000-000000000000' })
      .expect(401);
  });

  it('rejects an invalid Bearer token with 401', async () => {
    await request(app.getHttpServer())
      .get('/clients')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });
});
