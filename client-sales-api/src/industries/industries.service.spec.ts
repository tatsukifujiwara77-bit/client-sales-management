import { ConflictException, NotFoundException } from '@nestjs/common';
import { IndustriesService } from './industries.service.js';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';

interface MockResult {
  data: unknown;
  error: unknown;
}

function createBuilderMock(result: MockResult) {
  const chainMethods = ['select', 'eq', 'order', 'limit', 'update', 'insert', 'delete', 'maybeSingle', 'single'] as const;
  const builder: Record<string, unknown> = {};
  for (const method of chainMethods) {
    builder[method] = (..._args: unknown[]) => builder;
  }
  // oxlint-disable-next-line unicorn/no-thenable -- supabase-jsのクエリビルダーの仕様を模倣している
  (builder as any).then = (resolve: (v: MockResult) => unknown) => resolve(result);
  return builder;
}

function buildSupabaseRequestServiceMock(fromImpl: (table: string) => unknown): SupabaseRequestService {
  return { getClient: () => ({ from: fromImpl }) } as unknown as SupabaseRequestService;
}

describe('IndustriesService', () => {
  it('lists industries ordered by sort_order with usage counts attached', async () => {
    const fromSpy = (table: string) => {
      if (table === 'client_industries') {
        return createBuilderMock({
          data: [{ industry_id: 'ind-1' }, { industry_id: 'ind-1' }, { industry_id: 'ind-2' }],
          error: null,
        });
      }
      return createBuilderMock({
        data: [
          { id: 'ind-1', name: '製造', sort_order: 1, created_at: 'x', updated_at: 'x' },
          { id: 'ind-2', name: '物流・倉庫', sort_order: 2, created_at: 'x', updated_at: 'x' },
          { id: 'ind-3', name: 'その他', sort_order: 3, created_at: 'x', updated_at: 'x' },
        ],
        error: null,
      });
    };
    const service = new IndustriesService(buildSupabaseRequestServiceMock(fromSpy));

    const result = await service.list();

    expect(result).toEqual([
      { id: 'ind-1', name: '製造', sortOrder: 1, clientCount: 2, createdAt: 'x', updatedAt: 'x' },
      { id: 'ind-2', name: '物流・倉庫', sortOrder: 2, clientCount: 1, createdAt: 'x', updatedAt: 'x' },
      { id: 'ind-3', name: 'その他', sortOrder: 3, clientCount: 0, createdAt: 'x', updatedAt: 'x' },
    ]);
  });

  it('throws NotFoundException when updating an industry that does not exist', async () => {
    const builder = createBuilderMock({ data: null, error: null });
    const service = new IndustriesService(buildSupabaseRequestServiceMock(() => builder));

    await expect(service.update('missing', { name: '新名称' })).rejects.toThrow(NotFoundException);
  });

  it('removes an industry with no clients referencing it', async () => {
    const builder = createBuilderMock({ data: null, error: null });
    const service = new IndustriesService(buildSupabaseRequestServiceMock(() => builder));

    await expect(service.remove('ind-1')).resolves.toBeUndefined();
  });

  it('throws a friendly ConflictException when clients still reference the industry (FK violation)', async () => {
    const builder = createBuilderMock({ data: null, error: { code: '23503', message: 'fk violation' } });
    const service = new IndustriesService(buildSupabaseRequestServiceMock(() => builder));

    await expect(service.remove('ind-1')).rejects.toThrow(ConflictException);
  });
});
