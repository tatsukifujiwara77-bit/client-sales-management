import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('UsersController (e2e)', () => {
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

  it('GET /me requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer()).get('/me').expect(401);
  });

  it('GET /users requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer()).get('/users').expect(401);
  });

  it('GET /users/pending requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer()).get('/users/pending').expect(401);
  });

  it('PATCH /users/:id/approve requires authentication (401 without Authorization header)', async () => {
    await request(app.getHttpServer())
      .patch('/users/00000000-0000-0000-0000-000000000000/approve')
      .send({ role: 'sales_rep' })
      .expect(401);
  });
});
