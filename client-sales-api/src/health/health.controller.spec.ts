import { ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller.js';

function buildResMock() {
  return { status: vi.fn().mockReturnThis() } as any;
}

function buildConfigService(): ConfigService {
  return {
    getOrThrow: (key: string) =>
      key === 'SUPABASE_URL' ? 'https://example.supabase.co' : 'anon-key',
  } as unknown as ConfigService;
}

describe('HealthController', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns ok when the Supabase Auth health endpoint responds with 200', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);
    const controller = new HealthController(buildConfigService());

    const result = await controller.check(buildResMock());

    expect(result.status).toBe('ok');
    expect(result.supabase).toBe('ok');
  });

  it('returns error when the Supabase Auth health endpoint responds with a non-2xx status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false } as Response);
    const controller = new HealthController(buildConfigService());

    const result = await controller.check(buildResMock());

    expect(result.status).toBe('error');
    expect(result.supabase).toBe('error');
  });

  it('returns error when the request throws (e.g. network failure/timeout)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network unreachable'));
    const controller = new HealthController(buildConfigService());

    const result = await controller.check(buildResMock());

    expect(result.status).toBe('error');
    expect(result.supabase).toBe('error');
  });
});
