import { InternalServerErrorException } from '@nestjs/common';
import { AlertsService } from './alerts.service.js';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';

interface MockResult {
  data: unknown;
  error: unknown;
  count?: number;
}

function createBuilderMock(result: MockResult) {
  const calls: Record<string, unknown[][]> = {};
  const chainMethods = [
    'select',
    'eq',
    'in',
    'order',
    'range',
    'insert',
    'update',
    'delete',
    'maybeSingle',
    'single',
  ] as const;
  const builder: Record<string, unknown> = {};
  for (const method of chainMethods) {
    calls[method] = [];
    builder[method] = (...args: unknown[]) => {
      calls[method].push(args);
      return builder;
    };
  }
  // oxlint-disable-next-line unicorn/no-thenable -- supabase-jsのクエリビルダーの仕様を模倣している
  (builder as any).then = (resolve: (v: MockResult) => unknown) => resolve(result);
  return { builder, calls };
}

function buildSupabaseRequestServiceMock(fromImpl: (table: string) => unknown): SupabaseRequestService {
  return { getClient: () => ({ from: fromImpl }) } as unknown as SupabaseRequestService;
}

describe('AlertsService', () => {
  describe('recomputeForClient', () => {
    it('does nothing (and does not throw) when service_role is not configured', async () => {
      const service = new AlertsService(buildSupabaseRequestServiceMock(() => ({})), null);
      await expect(service.recomputeForClient('client-1')).resolves.toBeUndefined();
    });

    it('inserts an overdue alert for a pending action item past its due date, and a no_visit alert', async () => {
      const clientBuilder = createBuilderMock({
        data: { last_visited_at: '2026-01-01', sales_stage: { is_closed: false } },
        error: null,
      }).builder;
      const pendingItemsBuilder = createBuilderMock({
        data: [{ id: 'action-1', due_date: '2026-05-01' }],
        error: null,
      }).builder;
      const openAlertsBuilder = createBuilderMock({ data: [], error: null }).builder;
      const settingsBuilder = createBuilderMock({ data: { value: '90' }, error: null }).builder;

      let insertedRows: any;
      const calls: string[] = [];
      const fromSpy = vi.fn((table: string) => {
        calls.push(table);
        if (table === 'clients') return clientBuilder;
        if (table === 'action_items') return pendingItemsBuilder;
        if (table === 'alert_settings') return settingsBuilder;
        if (table === 'alerts') {
          // 1回目: 現在openのアラート取得 → 空配列
          // 2回目: insert
          const alertsCallCount = calls.filter((t) => t === 'alerts').length;
          if (alertsCallCount === 1) return openAlertsBuilder;
          const insertBuilder = createBuilderMock({ data: null, error: null }).builder;
          insertBuilder.insert = (rows: unknown) => {
            insertedRows = rows;
            return insertBuilder;
          };
          return insertBuilder;
        }
        return createBuilderMock({ data: null, error: null }).builder;
      });

      const supabaseRequestService = buildSupabaseRequestServiceMock(() => ({}));
      const service = new AlertsService(supabaseRequestService, { from: fromSpy } as any);

      await service.recomputeForClient('client-1');

      expect(insertedRows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ alert_type: 'overdue', action_item_id: 'action-1' }),
          expect.objectContaining({ alert_type: 'no_visit', action_item_id: null }),
        ]),
      );
    });
  });

  describe('recomputeAll', () => {
    it('throws InternalServerErrorException when service_role is not configured', async () => {
      const service = new AlertsService(buildSupabaseRequestServiceMock(() => ({})), null);
      await expect(service.recomputeAll()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('recomputeAllOnSchedule', () => {
    it('does not throw even when service_role is not configured (logs and returns instead)', async () => {
      const service = new AlertsService(buildSupabaseRequestServiceMock(() => ({})), null);
      await expect(service.recomputeAllOnSchedule()).resolves.toBeUndefined();
    });

    it('delegates to recomputeAll when service_role is configured', async () => {
      const service = new AlertsService(buildSupabaseRequestServiceMock(() => ({})), null);
      const recomputeAllSpy = vi.spyOn(service, 'recomputeAll').mockResolvedValue({ clientsProcessed: 3 });

      await service.recomputeAllOnSchedule();

      expect(recomputeAllSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('list / getCounts', () => {
    it('returns paged alerts scoped to a client when clientId is provided', async () => {
      const alertRow = {
        id: 'alert-1',
        client_id: 'client-1',
        action_item_id: 'action-1',
        alert_type: 'overdue',
        target_date: '2026-05-01',
        status: 'open',
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
        client: {
          company_name: '南国殖産株式会社',
          assignments: [
            { is_primary: false, profile: { id: 'user-2', full_name: '佐藤 花子' } },
            { is_primary: true, profile: { id: 'user-1', full_name: '藤原 樹' } },
          ],
        },
      };
      const { builder, calls } = createBuilderMock({ data: [alertRow], error: null, count: 1 });
      const supabaseRequestService = buildSupabaseRequestServiceMock(() => builder);
      const service = new AlertsService(supabaseRequestService, null);

      const result = await service.list({ status: 'open' }, 'client-1');

      expect(calls.eq).toEqual(expect.arrayContaining([['status', 'open'], ['client_id', 'client-1']]));
      expect(result.items[0]).toMatchObject({
        id: 'alert-1',
        clientName: '南国殖産株式会社',
        primaryAssignee: { id: 'user-1', fullName: '藤原 樹' },
      });
    });

    it('filters list() by officeId using an inner join on the embedded client', async () => {
      const { builder, calls } = createBuilderMock({ data: [], error: null, count: 0 });
      const supabaseRequestService = buildSupabaseRequestServiceMock(() => builder);
      const service = new AlertsService(supabaseRequestService, null);

      await service.list({ status: 'open', officeId: 'office-1' });

      expect(calls.select[0][0]).toContain('client:clients!inner(company_name, office_id');
      expect(calls.eq).toEqual(expect.arrayContaining([['client.office_id', 'office-1']]));
    });

    it('filters getCounts() by officeId using an inner join on the embedded client', async () => {
      const { builder, calls } = createBuilderMock({ data: [], error: null, count: 0 });
      const supabaseRequestService = buildSupabaseRequestServiceMock(() => builder);
      const service = new AlertsService(supabaseRequestService, null);

      await service.getCounts(undefined, 'office-1');

      expect(calls.select[0][0]).toBe('id, client:clients!inner(office_id)');
      expect(calls.eq).toEqual(expect.arrayContaining([['client.office_id', 'office-1']]));
    });
  });
});
