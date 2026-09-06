import { OfficesService } from './offices.service.js';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';

interface MockResult {
  data: unknown;
  error: unknown;
}

function createBuilderMock(result: MockResult) {
  const chainMethods = ['select', 'order'] as const;
  const builder: Record<string, unknown> = {};
  for (const method of chainMethods) {
    builder[method] = (..._args: unknown[]) => builder;
  }
  // oxlint-disable-next-line unicorn/no-thenable -- supabase-jsのクエリビルダーの仕様を模倣している
  (builder as any).then = (resolve: (v: MockResult) => unknown) => resolve(result);
  return builder;
}

describe('OfficesService', () => {
  it('lists offices ordered by name', async () => {
    const builder = createBuilderMock({
      data: [{ id: 'office-1', name: '九州営業部', prefecture: '福岡県', address: null }],
      error: null,
    });
    const supabaseRequestService = { getClient: () => ({ from: () => builder }) } as unknown as SupabaseRequestService;
    const service = new OfficesService(supabaseRequestService);

    const result = await service.list();
    expect(result).toEqual([{ id: 'office-1', name: '九州営業部', prefecture: '福岡県', address: null }]);
  });
});
