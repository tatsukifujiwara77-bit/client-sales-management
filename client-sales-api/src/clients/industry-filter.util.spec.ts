import { NO_MATCH_CLIENT_ID, resolveClientIdsForIndustryFilter } from './industry-filter.util.js';

interface MockResult {
  data: unknown;
  error: unknown;
}

function createBuilderMock(result: MockResult) {
  const chainMethods = ['select', 'in'] as const;
  const builder: Record<string, unknown> = {};
  for (const method of chainMethods) {
    builder[method] = (..._args: unknown[]) => builder;
  }
  // oxlint-disable-next-line unicorn/no-thenable -- supabase-jsのクエリビルダーの仕様を模倣している
  (builder as any).then = (resolve: (v: MockResult) => unknown) => resolve(result);
  return builder;
}

describe('resolveClientIdsForIndustryFilter', () => {
  it('returns client ids that have any of the given industries (OR)', async () => {
    const builder = createBuilderMock({
      data: [{ client_id: 'client-1' }, { client_id: 'client-2' }],
      error: null,
    });
    const client = { from: () => builder } as any;

    const result = await resolveClientIdsForIndustryFilter(client, ['industry-a']);

    expect(result.sort()).toEqual(['client-1', 'client-2']);
  });

  it('resolves the "unassigned" sentinel to clients with no client_industries rows', async () => {
    const tables: Record<string, MockResult> = {
      clients: { data: [{ id: 'client-1' }, { id: 'client-2' }, { id: 'client-3' }], error: null },
      client_industries: { data: [{ client_id: 'client-2' }], error: null },
    };
    const client = {
      from: (table: string) => createBuilderMock(tables[table]),
    } as any;

    const result = await resolveClientIdsForIndustryFilter(client, ['unassigned']);

    expect(result.sort()).toEqual(['client-1', 'client-3']);
  });

  it('unions real-industry matches with unassigned clients when both are selected', async () => {
    const tables: Record<string, MockResult> = {
      clients: { data: [{ id: 'client-1' }, { id: 'client-2' }, { id: 'client-3' }], error: null },
      client_industries: { data: [{ client_id: 'client-2' }], error: null },
    };
    let clientIndustriesCallCount = 0;
    const client = {
      from: (table: string) => {
        if (table === 'client_industries') {
          clientIndustriesCallCount += 1;
          // 1回目: 実業種フィルタ用(industry_id.in) / 2回目: unassigned判定用(全件)
          return createBuilderMock(
            clientIndustriesCallCount === 1 ? { data: [{ client_id: 'client-2' }], error: null } : tables.client_industries,
          );
        }
        return createBuilderMock(tables[table]);
      },
    } as any;

    const result = await resolveClientIdsForIndustryFilter(client, ['industry-a', 'unassigned']);

    // industry-a -> client-2 / unassigned -> client-1, client-3
    expect(result.sort()).toEqual(['client-1', 'client-2', 'client-3']);
  });

  it('exports a dummy client id constant to represent "no matches" for callers', () => {
    expect(NO_MATCH_CLIENT_ID).toBe('00000000-0000-0000-0000-000000000000');
  });
});
