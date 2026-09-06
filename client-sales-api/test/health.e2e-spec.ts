import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it(
    '/health (GET) is public and returns a health payload without Authorization header',
    async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect([200, 503]).toContain(res.status);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: expect.stringMatching(/^(ok|error)$/),
          supabase: expect.stringMatching(/^(ok|error)$/),
          timestamp: expect.any(String),
        }),
      );
    },
    10000,
  );

  afterEach(async () => {
    await app.close();
  });
});
