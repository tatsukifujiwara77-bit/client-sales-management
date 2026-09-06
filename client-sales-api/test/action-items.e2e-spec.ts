import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

const CLIENT_ID = '00000000-0000-0000-0000-000000000000';
const ACTION_ITEM_ID = '11111111-1111-1111-1111-111111111111';

describe('ActionItemsController (e2e)', () => {
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

  it('GET /clients/:id/action-items requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer()).get(`/clients/${CLIENT_ID}/action-items`).expect(401);
  });

  it('POST /clients/:id/action-items requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer())
      .post(`/clients/${CLIENT_ID}/action-items`)
      .send({ content: '提案資料のご説明', dueDate: '2026-05-21' })
      .expect(401);
  });

  it('POST /clients/:id/action-items/:actionItemId/complete requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer())
      .post(`/clients/${CLIENT_ID}/action-items/${ACTION_ITEM_ID}/complete`)
      .send({})
      .expect(401);
  });
});
