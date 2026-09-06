import { NotFoundException } from '@nestjs/common';
import { SalesStagesService } from './sales-stages.service.js';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';

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

function buildSupabaseRequestServiceMock(builder: unknown): SupabaseRequestService {
  return { getClient: () => ({ from: () => builder }) } as unknown as SupabaseRequestService;
}

describe('SalesStagesService', () => {
  it('lists stages ordered by sort_order and maps them', async () => {
    const builder = createBuilderMock({
      data: [{ id: 'stage-1', name: '未接触', sort_order: 1, is_closed: false, created_at: 'x', updated_at: 'x' }],
      error: null,
    });
    const service = new SalesStagesService(buildSupabaseRequestServiceMock(builder));

    const result = await service.list();
    expect(result).toEqual([
      { id: 'stage-1', name: '未接触', sortOrder: 1, isClosed: false, createdAt: 'x', updatedAt: 'x' },
    ]);
  });

  it('throws NotFoundException when updating a stage that does not exist (e.g. RLSにより拒否)', async () => {
    const builder = createBuilderMock({ data: null, error: null });
    const service = new SalesStagesService(buildSupabaseRequestServiceMock(builder));

    await expect(service.update('missing', { name: '新名称' })).rejects.toThrow(NotFoundException);
  });
});
