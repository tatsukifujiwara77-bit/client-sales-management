import { NotFoundException } from '@nestjs/common';
import { AlertSettingsService } from './alert-settings.service.js';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

interface MockResult {
  data: unknown;
  error: unknown;
}

function createBuilderMock(result: MockResult) {
  const chainMethods = ['select', 'eq', 'order', 'update', 'maybeSingle'] as const;
  const builder: Record<string, unknown> = {};
  for (const method of chainMethods) {
    builder[method] = (..._args: unknown[]) => builder;
  }
  // oxlint-disable-next-line unicorn/no-thenable -- supabase-jsのクエリビルダーの仕様を模倣している
  (builder as any).then = (resolve: (v: MockResult) => unknown) => resolve(result);
  return builder;
}

const currentUser: AuthUser = {
  id: 'user-1',
  email: 'admin@example.com',
  fullName: '藤原 樹',
  role: 'admin',
  officeId: null,
  isActive: true,
};

describe('AlertSettingsService', () => {
  it('lists settings', async () => {
    const builder = createBuilderMock({
      data: [{ key: 'no_visit_threshold_days', value: '90', description: null, updated_at: '2026-05-20T00:00:00Z' }],
      error: null,
    });
    const service = new AlertSettingsService({ getClient: () => ({ from: () => builder }) } as unknown as SupabaseRequestService);

    const result = await service.list();
    expect(result).toEqual([
      { key: 'no_visit_threshold_days', value: '90', description: null, updatedAt: '2026-05-20T00:00:00Z' },
    ]);
  });

  it('throws NotFoundException when updating an unknown key (e.g. RLSにより拒否)', async () => {
    const builder = createBuilderMock({ data: null, error: null });
    const service = new AlertSettingsService({ getClient: () => ({ from: () => builder }) } as unknown as SupabaseRequestService);

    await expect(service.update('unknown_key', '30', currentUser)).rejects.toThrow(NotFoundException);
  });
});
