import { InternalServerErrorException } from '@nestjs/common';
import { AlertsService } from './alerts.service.js';
import { todayDateString } from './date.util.js';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';

/** テスト実行日に依存せず「昨日」を求める(due_dateがtodayより前=overdueになるようにするため) */
function yesterdayDateString(): string {
  const [year, month, day] = todayDateString().split('-').map(Number);
  const yesterday = new Date(Date.UTC(year, month - 1, day - 1));
  return yesterday.toISOString().slice(0, 10);
}

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

    it('does not re-open an alert that was dismissed while the due-date bucket is unchanged', async () => {
      const today = todayDateString();
      const clientBuilder = createBuilderMock({
        data: { last_visited_at: today, sales_stage: { is_closed: false } },
        error: null,
      }).builder;
      const pendingItemsBuilder = createBuilderMock({
        data: [{ id: 'action-1', due_date: today }], // 今日が期限 → due_today
        error: null,
      }).builder;
      const existingAlertsBuilder = createBuilderMock({
        data: [
          {
            id: 'alert-1',
            action_item_id: 'action-1',
            alert_type: 'due_today',
            status: 'dismissed',
            updated_at: `${today}T00:00:00Z`,
          },
        ],
        error: null,
      }).builder;
      const settingsBuilder = createBuilderMock({ data: { value: '90' }, error: null }).builder;

      let insertCalled = false;
      const calls: string[] = [];
      const fromSpy = vi.fn((table: string) => {
        calls.push(table);
        if (table === 'clients') return clientBuilder;
        if (table === 'action_items') return pendingItemsBuilder;
        if (table === 'alert_settings') return settingsBuilder;
        if (table === 'alerts') {
          const alertsCallCount = calls.filter((t) => t === 'alerts').length;
          if (alertsCallCount === 1) return existingAlertsBuilder;
          const insertBuilder = createBuilderMock({ data: null, error: null }).builder;
          insertBuilder.insert = (rows: unknown) => {
            insertCalled = true;
            return insertBuilder;
          };
          return insertBuilder;
        }
        return createBuilderMock({ data: null, error: null }).builder;
      });

      const service = new AlertsService(
        buildSupabaseRequestServiceMock(() => ({})),
        { from: fromSpy } as any,
      );

      await service.recomputeForClient('client-1');

      expect(insertCalled).toBe(false);
    });

    it('re-opens a new alert when the due-date bucket has changed since it was dismissed', async () => {
      const today = todayDateString();
      const yesterday = yesterdayDateString();
      const clientBuilder = createBuilderMock({
        data: { last_visited_at: today, sales_stage: { is_closed: false } },
        error: null,
      }).builder;
      const pendingItemsBuilder = createBuilderMock({
        data: [{ id: 'action-1', due_date: yesterday }], // 昨日が期限 → overdue
        error: null,
      }).builder;
      const existingAlertsBuilder = createBuilderMock({
        data: [
          {
            // 却下した時点では"due_today"だったが、その後overdueに悪化している
            id: 'alert-1',
            action_item_id: 'action-1',
            alert_type: 'due_today',
            status: 'dismissed',
            updated_at: `${yesterday}T00:00:00Z`,
          },
        ],
        error: null,
      }).builder;
      const settingsBuilder = createBuilderMock({ data: { value: '90' }, error: null }).builder;

      let insertedRows: any;
      const calls: string[] = [];
      const fromSpy = vi.fn((table: string) => {
        calls.push(table);
        if (table === 'clients') return clientBuilder;
        if (table === 'action_items') return pendingItemsBuilder;
        if (table === 'alert_settings') return settingsBuilder;
        if (table === 'alerts') {
          const alertsCallCount = calls.filter((t) => t === 'alerts').length;
          if (alertsCallCount === 1) return existingAlertsBuilder;
          const insertBuilder = createBuilderMock({ data: null, error: null }).builder;
          insertBuilder.insert = (rows: unknown) => {
            insertedRows = rows;
            return insertBuilder;
          };
          return insertBuilder;
        }
        return createBuilderMock({ data: null, error: null }).builder;
      });

      const service = new AlertsService(
        buildSupabaseRequestServiceMock(() => ({})),
        { from: fromSpy } as any,
      );

      await service.recomputeForClient('client-1');

      expect(insertedRows).toEqual(
        expect.arrayContaining([expect.objectContaining({ alert_type: 'overdue', action_item_id: 'action-1' })]),
      );
    });

    it('does not flag a newly-created client with no visit history yet (uses created_at as the reference date)', async () => {
      const today = todayDateString();
      const clientBuilder = createBuilderMock({
        data: { last_visited_at: null, created_at: `${today}T00:00:00Z`, sales_stage: { is_closed: false } },
        error: null,
      }).builder;
      const pendingItemsBuilder = createBuilderMock({ data: [], error: null }).builder;
      const existingAlertsBuilder = createBuilderMock({ data: [], error: null }).builder;
      const settingsBuilder = createBuilderMock({ data: { value: '90' }, error: null }).builder;

      let insertCalled = false;
      const calls: string[] = [];
      const fromSpy = vi.fn((table: string) => {
        calls.push(table);
        if (table === 'clients') return clientBuilder;
        if (table === 'action_items') return pendingItemsBuilder;
        if (table === 'alert_settings') return settingsBuilder;
        if (table === 'alerts') {
          const alertsCallCount = calls.filter((t) => t === 'alerts').length;
          if (alertsCallCount === 1) return existingAlertsBuilder;
          const insertBuilder = createBuilderMock({ data: null, error: null }).builder;
          insertBuilder.insert = () => {
            insertCalled = true;
            return insertBuilder;
          };
          return insertBuilder;
        }
        return createBuilderMock({ data: null, error: null }).builder;
      });

      const service = new AlertsService(
        buildSupabaseRequestServiceMock(() => ({})),
        { from: fromSpy } as any,
      );

      await service.recomputeForClient('client-1');

      expect(insertCalled).toBe(false);
    });

    it('flags a client with no visit history once the threshold has elapsed since created_at', async () => {
      const today = todayDateString();
      const [year, month, day] = today.split('-').map(Number);
      const longAgo = new Date(Date.UTC(year, month - 1, day - 100)).toISOString().slice(0, 10);
      const clientBuilder = createBuilderMock({
        data: { last_visited_at: null, created_at: `${longAgo}T00:00:00Z`, sales_stage: { is_closed: false } },
        error: null,
      }).builder;
      const pendingItemsBuilder = createBuilderMock({ data: [], error: null }).builder;
      const existingAlertsBuilder = createBuilderMock({ data: [], error: null }).builder;
      const settingsBuilder = createBuilderMock({ data: { value: '90' }, error: null }).builder;

      let insertedRows: any;
      const calls: string[] = [];
      const fromSpy = vi.fn((table: string) => {
        calls.push(table);
        if (table === 'clients') return clientBuilder;
        if (table === 'action_items') return pendingItemsBuilder;
        if (table === 'alert_settings') return settingsBuilder;
        if (table === 'alerts') {
          const alertsCallCount = calls.filter((t) => t === 'alerts').length;
          if (alertsCallCount === 1) return existingAlertsBuilder;
          const insertBuilder = createBuilderMock({ data: null, error: null }).builder;
          insertBuilder.insert = (rows: unknown) => {
            insertedRows = rows;
            return insertBuilder;
          };
          return insertBuilder;
        }
        return createBuilderMock({ data: null, error: null }).builder;
      });

      const service = new AlertsService(
        buildSupabaseRequestServiceMock(() => ({})),
        { from: fromSpy } as any,
      );

      await service.recomputeForClient('client-1');

      expect(insertedRows).toEqual(
        expect.arrayContaining([expect.objectContaining({ alert_type: 'no_visit', action_item_id: null })]),
      );
    });

    it('does not flag a client that has been individually excluded from the no-visit alert', async () => {
      const clientBuilder = createBuilderMock({
        data: { last_visited_at: '2026-01-01', created_at: '2026-01-01T00:00:00Z', no_visit_alert_excluded: true },
        error: null,
      }).builder;
      const pendingItemsBuilder = createBuilderMock({ data: [], error: null }).builder;
      const existingAlertsBuilder = createBuilderMock({ data: [], error: null }).builder;
      const settingsBuilder = createBuilderMock({ data: { value: '90' }, error: null }).builder;

      let insertCalled = false;
      const calls: string[] = [];
      const fromSpy = vi.fn((table: string) => {
        calls.push(table);
        if (table === 'clients') return clientBuilder;
        if (table === 'action_items') return pendingItemsBuilder;
        if (table === 'alert_settings') return settingsBuilder;
        if (table === 'alerts') {
          const alertsCallCount = calls.filter((t) => t === 'alerts').length;
          if (alertsCallCount === 1) return existingAlertsBuilder;
          const insertBuilder = createBuilderMock({ data: null, error: null }).builder;
          insertBuilder.insert = () => {
            insertCalled = true;
            return insertBuilder;
          };
          return insertBuilder;
        }
        return createBuilderMock({ data: null, error: null }).builder;
      });

      const service = new AlertsService(
        buildSupabaseRequestServiceMock(() => ({})),
        { from: fromSpy } as any,
      );

      await service.recomputeForClient('client-1');

      expect(insertCalled).toBe(false);
    });

    it('resolves an already-open no-visit alert once the client is excluded', async () => {
      const clientBuilder = createBuilderMock({
        data: { last_visited_at: '2026-01-01', created_at: '2026-01-01T00:00:00Z', no_visit_alert_excluded: true },
        error: null,
      }).builder;
      const pendingItemsBuilder = createBuilderMock({ data: [], error: null }).builder;
      const existingAlertsBuilder = createBuilderMock({
        data: [
          {
            id: 'alert-1',
            action_item_id: null,
            alert_type: 'no_visit',
            status: 'open',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        error: null,
      }).builder;
      const settingsBuilder = createBuilderMock({ data: { value: '90' }, error: null }).builder;

      let resolvedIds: any;
      const calls: string[] = [];
      const fromSpy = vi.fn((table: string) => {
        calls.push(table);
        if (table === 'clients') return clientBuilder;
        if (table === 'action_items') return pendingItemsBuilder;
        if (table === 'alert_settings') return settingsBuilder;
        if (table === 'alerts') {
          const alertsCallCount = calls.filter((t) => t === 'alerts').length;
          if (alertsCallCount === 1) return existingAlertsBuilder;
          const updateBuilder = createBuilderMock({ data: null, error: null }).builder;
          updateBuilder.update = (row: unknown) => updateBuilder;
          updateBuilder.in = (_col: string, ids: unknown) => {
            resolvedIds = ids;
            return updateBuilder;
          };
          return updateBuilder;
        }
        return createBuilderMock({ data: null, error: null }).builder;
      });

      const service = new AlertsService(
        buildSupabaseRequestServiceMock(() => ({})),
        { from: fromSpy } as any,
      );

      await service.recomputeForClient('client-1');

      expect(resolvedIds).toEqual(['alert-1']);
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

  describe('getDashboard', () => {
    it('does not recompute anything when query.refresh is not set (fast path for the layout badge etc.)', async () => {
      const { builder } = createBuilderMock({ data: [], error: null, count: 0 });
      const service = new AlertsService(buildSupabaseRequestServiceMock(() => builder), null);
      const recomputeAllSpy = vi.spyOn(service, 'recomputeAll');
      const recomputeForClientSpy = vi.spyOn(service, 'recomputeForClient');

      await service.getDashboard({ status: 'open' });

      expect(recomputeAllSpy).not.toHaveBeenCalled();
      expect(recomputeForClientSpy).not.toHaveBeenCalled();
    });

    it('recomputes only the given client (not all clients) when refresh is set with a clientId', async () => {
      const { builder } = createBuilderMock({ data: [], error: null, count: 0 });
      const service = new AlertsService(buildSupabaseRequestServiceMock(() => builder), null);
      const recomputeAllSpy = vi.spyOn(service, 'recomputeAll');
      const recomputeForClientSpy = vi.spyOn(service, 'recomputeForClient').mockResolvedValue(undefined);

      await service.getDashboard({ status: 'open', refresh: true }, 'client-1');

      expect(recomputeForClientSpy).toHaveBeenCalledWith('client-1');
      expect(recomputeAllSpy).not.toHaveBeenCalled();
    });

    it('recomputes all clients when refresh is set without a clientId (main alerts page)', async () => {
      const { builder } = createBuilderMock({ data: [], error: null, count: 0 });
      const service = new AlertsService(buildSupabaseRequestServiceMock(() => builder), null);
      const recomputeAllSpy = vi.spyOn(service, 'recomputeAll').mockResolvedValue({ clientsProcessed: 0 });

      await service.getDashboard({ status: 'open', refresh: true });

      expect(recomputeAllSpy).toHaveBeenCalledTimes(1);
    });
  });
});
