import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

const CLIENT_ID = '00000000-0000-0000-0000-000000000000';

describe('Client contacts / notes / dossier (e2e)', () => {
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

  it('GET /clients/:id/dossier requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer()).get(`/clients/${CLIENT_ID}/dossier`).expect(401);
  });

  it('GET /clients/:id/contacts requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer()).get(`/clients/${CLIENT_ID}/contacts`).expect(401);
  });

  it('POST /clients/:id/contacts requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer())
      .post(`/clients/${CLIENT_ID}/contacts`)
      .send({ name: 'テスト太郎' })
      .expect(401);
  });

  it('GET /clients/:id/notes requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer()).get(`/clients/${CLIENT_ID}/notes`).expect(401);
  });

  it('POST /clients/:id/notes requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer())
      .post(`/clients/${CLIENT_ID}/notes`)
      .send({ content: 'テストメモ' })
      .expect(401);
  });
});
