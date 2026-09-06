import { NotFoundException } from '@nestjs/common';
import { ActivitiesService } from './activities.service.js';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import type { AlertsService } from '../alerts/alerts.service.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

function buildStubAlertsService(): AlertsService {
  return { recomputeForClient: vi.fn().mockResolvedValue(undefined) } as unknown as AlertsService;
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
    'gte',
    'lte',
    'order',
    'range',
    'limit',
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
  // oxlint-disable-next-line unicorn/no-thenable -- supabase-jsのクエリビルダー自体がthenableな仕様のため、模倣している
  (builder as any).then = (resolve: (value: MockResult) => unknown) => resolve(result);

  return { builder, calls };
}

const currentUser: AuthUser = {
  id: 'user-1',
  email: 'user@example.com',
  fullName: '藤原 樹',
  role: 'sales_rep',
  officeId: 'office-1',
  isActive: true,
};

describe('ActivitiesService', () => {
  describe('create', () => {
    it('inserts the activity and refreshes the client activity cache', async () => {
      const activityRow = {
        id: 'activity-1',
        client_id: 'client-1',
        activity_type: 'meeting',
        activity_date: '2026-05-20',
        participants: '南国殖産:髙江洲様/当社:藤原',
        notes: '九州エリアの採用状況について商談',
        created_at: '2026-05-20T00:00:00Z',
        updated_at: '2026-05-20T00:00:00Z',
        owner: { id: 'user-1', full_name: '藤原 樹' },
      };
      const activityBuilder = createBuilderMock({ data: activityRow, error: null }).builder;
      const cacheBuilder = createBuilderMock({
        data: { activity_date: '2026-05-20' },
        error: null,
      }).builder;
      const clientsUpdateBuilder = createBuilderMock({ data: null, error: null }).builder;

      // activitiesテーブルは insert 用と cache 再計算用の select の両方で呼ばれるため、
      // 1回目は insert 用、2回目以降は cache 用の builder を返す。
      let activitiesCallCount = 0;
      const fromSpy = vi.fn((table: string) => {
        if (table === 'activities') {
          activitiesCallCount += 1;
          return activitiesCallCount === 1 ? activityBuilder : cacheBuilder;
        }
        return clientsUpdateBuilder;
      });

      const supabaseRequestService = {
        getClient: () => ({ from: fromSpy }),
      } as unknown as SupabaseRequestService;
      const service = new ActivitiesService(supabaseRequestService, buildStubAlertsService());

      const result = await service.create(
        'client-1',
        { activityType: 'meeting', activityDate: '2026-05-20', notes: '九州エリアの採用状況について商談' },
        currentUser,
      );

      expect(result).toMatchObject({ id: 'activity-1', activityType: 'meeting', owner: { fullName: '藤原 樹' } });
      expect(fromSpy).toHaveBeenCalledWith('clients');
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the activity does not exist/is not accessible', async () => {
      const { builder } = createBuilderMock({ data: null, error: null });
      const supabaseRequestService = {
        getClient: () => ({ from: () => builder }),
      } as unknown as SupabaseRequestService;
      const service = new ActivitiesService(supabaseRequestService, buildStubAlertsService());

      await expect(service.findOne('client-1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findLatestForClient', () => {
    it('returns null when there are no activities yet', async () => {
      const { builder } = createBuilderMock({ data: null, error: null });
      const supabaseRequestService = {
        getClient: () => ({ from: () => builder }),
      } as unknown as SupabaseRequestService;
      const service = new ActivitiesService(supabaseRequestService, buildStubAlertsService());

      await expect(service.findLatestForClient('client-1')).resolves.toBeNull();
    });
  });

  describe('remove', () => {
    it('does not throw when the best-effort cache refresh itself fails', async () => {
      const deleteBuilder = createBuilderMock({ data: null, error: null }).builder;
      const cacheReadBuilder = createBuilderMock({ data: null, error: { message: 'boom' } }).builder;

      // 最初の from('activities') 呼び出しは delete、以降は失敗するキャッシュ再計算用のselect。
      let firstCall = true;
      const fromSpy = vi.fn((table: string) => {
        if (table === 'activities' && firstCall) {
          firstCall = false;
          return deleteBuilder;
        }
        return cacheReadBuilder;
      });

      const supabaseRequestService = {
        getClient: () => ({ from: fromSpy }),
      } as unknown as SupabaseRequestService;
      const service = new ActivitiesService(supabaseRequestService, buildStubAlertsService());

      await expect(service.remove('client-1', 'activity-1')).resolves.toBeUndefined();
    });
  });

  describe('findRecentAcrossClients', () => {
    it('maps rows including the client name (no client_id filter applied)', async () => {
      const row = {
        id: 'activity-1',
        client_id: 'client-1',
        activity_type: 'visit',
        activity_date: '2026-05-20',
        notes: '九州エリアの採用状況について商談',
        owner: { id: 'user-1', full_name: '藤原 樹' },
        client: { company_name: '南国殖産株式会社' },
      };
      const { builder, calls } = createBuilderMock({ data: [row], error: null });
      const supabaseRequestService = { getClient: () => ({ from: () => builder }) } as unknown as SupabaseRequestService;
      const service = new ActivitiesService(supabaseRequestService, buildStubAlertsService());

      const result = await service.findRecentAcrossClients(10);

      expect(calls.eq).toHaveLength(0);
      expect(result).toEqual([
        {
          id: 'activity-1',
          clientId: 'client-1',
          clientName: '南国殖産株式会社',
          activityType: 'visit',
          activityDate: '2026-05-20',
          notes: '九州エリアの採用状況について商談',
          owner: { id: 'user-1', fullName: '藤原 樹' },
        },
      ]);
    });
  });

  describe('listAcrossClients', () => {
    it('paginates and maps rows including the client name', async () => {
      const row = {
        id: 'activity-1',
        client_id: 'client-1',
        activity_type: 'visit',
        activity_date: '2026-05-20',
        notes: '九州エリアの採用状況について商談',
        owner: { id: 'user-1', full_name: '藤原 樹' },
        client: { company_name: '南国殖産株式会社' },
      };
      const { builder, calls } = createBuilderMock({ data: [row], error: null, count: 1 });
      const supabaseRequestService = { getClient: () => ({ from: () => builder }) } as unknown as SupabaseRequestService;
      const service = new ActivitiesService(supabaseRequestService, buildStubAlertsService());

      const result = await service.listAcrossClients({ page: 1, pageSize: 20 });

      expect(result).toEqual({
        items: [
          {
            id: 'activity-1',
            clientId: 'client-1',
            clientName: '南国殖産株式会社',
            activityType: 'visit',
            activityDate: '2026-05-20',
            notes: '九州エリアの採用状況について商談',
            owner: { id: 'user-1', fullName: '藤原 樹' },
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      });
      expect(calls.eq).toHaveLength(0);
    });

    it('filters by activityType/clientId/ownerId/date range when provided', async () => {
      const { builder, calls } = createBuilderMock({ data: [], error: null, count: 0 });
      const supabaseRequestService = { getClient: () => ({ from: () => builder }) } as unknown as SupabaseRequestService;
      const service = new ActivitiesService(supabaseRequestService, buildStubAlertsService());

      await service.listAcrossClients({
        activityType: 'visit',
        clientId: 'client-1',
        ownerId: 'user-1',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31',
        page: 1,
        pageSize: 20,
      });

      expect(calls.eq).toEqual(
        expect.arrayContaining([
          ['activity_type', 'visit'],
          ['client_id', 'client-1'],
          ['owner_id', 'user-1'],
        ]),
      );
      expect(calls.gte).toEqual(expect.arrayContaining([['activity_date', '2026-05-01']]));
      expect(calls.lte).toEqual(expect.arrayContaining([['activity_date', '2026-05-31']]));
    });

    it('filters by officeId using an inner join on the embedded client', async () => {
      const { builder, calls } = createBuilderMock({ data: [], error: null, count: 0 });
      const supabaseRequestService = { getClient: () => ({ from: () => builder }) } as unknown as SupabaseRequestService;
      const service = new ActivitiesService(supabaseRequestService, buildStubAlertsService());

      await service.listAcrossClients({ officeId: 'office-1', page: 1, pageSize: 20 });

      expect(calls.select[0][0]).toContain('client:clients!inner(company_name, office_id)');
      expect(calls.eq).toEqual(expect.arrayContaining([['client.office_id', 'office-1']]));
    });
  });

  describe('findForMeetingReview', () => {
    it('uses an inner-joined client embed and filters by office_id only when officeId is provided', async () => {
      const row = {
        id: 'activity-1',
        client_id: 'client-1',
        activity_type: 'visit',
        activity_date: '2026-05-20',
        owner: { id: 'user-1', full_name: '藤原 樹' },
        client: { company_name: '南国殖産株式会社', office_id: 'office-1' },
      };
      const { builder, calls } = createBuilderMock({ data: [row], error: null });
      const supabaseRequestService = { getClient: () => ({ from: () => builder }) } as unknown as SupabaseRequestService;
      const service = new ActivitiesService(supabaseRequestService, buildStubAlertsService());

      await service.findForMeetingReview({ dateFrom: '2026-05-13', dateTo: '2026-05-20', officeId: 'office-1' });

      expect(calls.select[0][0]).toContain('clients!inner');
      expect(calls.eq).toEqual(expect.arrayContaining([['client.office_id', 'office-1']]));
    });

    it('does not filter by office when officeId is omitted', async () => {
      const { builder, calls } = createBuilderMock({ data: [], error: null });
      const supabaseRequestService = { getClient: () => ({ from: () => builder }) } as unknown as SupabaseRequestService;
      const service = new ActivitiesService(supabaseRequestService, buildStubAlertsService());

      await service.findForMeetingReview({ dateFrom: '2026-05-13', dateTo: '2026-05-20' });

      expect(calls.select[0][0]).not.toContain('!inner');
    });
  });
});
