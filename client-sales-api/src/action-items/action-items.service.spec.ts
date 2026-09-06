import { ConflictException, NotFoundException } from '@nestjs/common';
import { ActionItemsService } from './action-items.service.js';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import type { ActivitiesService } from '../activities/activities.service.js';
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
    builder[method] = (..._args: unknown[]) => builder;
  }
  // oxlint-disable-next-line unicorn/no-thenable -- supabase-jsのクエリビルダーの仕様を模倣している
  (builder as any).then = (resolve: (v: MockResult) => unknown) => resolve(result);
  return builder;
}

function buildSupabaseRequestServiceMock(fromImpl: (table: string) => unknown): SupabaseRequestService {
  return { getClient: () => ({ from: fromImpl }) } as unknown as SupabaseRequestService;
}

const currentUser: AuthUser = {
  id: 'user-1',
  email: 'user@example.com',
  fullName: '藤原 樹',
  role: 'sales_rep',
  officeId: 'office-1',
  isActive: true,
};

const pendingActionItemRow = {
  id: 'action-1',
  client_id: 'client-1',
  source_activity_id: null,
  content: '提案資料のご説明',
  due_date: '2026-05-21',
  notify_before: 'none',
  status: 'pending',
  completed_at: null,
  completed_activity_id: null,
  created_at: '2026-05-20T00:00:00Z',
  updated_at: '2026-05-20T00:00:00Z',
  assignee: { id: 'user-1', full_name: '藤原 樹' },
};

describe('ActionItemsService', () => {
  describe('create', () => {
    it('defaults assigned_to to the current user when not provided', async () => {
      const builder = createBuilderMock({ data: pendingActionItemRow, error: null });
      let insertedRow: any;
      builder.insert = (row: unknown) => {
        insertedRow = row;
        return builder;
      };
      const activitiesService = {} as unknown as ActivitiesService;
      const service = new ActionItemsService(buildSupabaseRequestServiceMock(() => builder), activitiesService, buildStubAlertsService());

      await service.create('client-1', { content: '提案資料のご説明', dueDate: '2026-05-21' }, currentUser);

      expect(insertedRow.assigned_to).toBe('user-1');
      expect(insertedRow.notify_before).toBe('none');
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the row does not exist/is not accessible', async () => {
      const builder = createBuilderMock({ data: null, error: null });
      const activitiesService = {} as unknown as ActivitiesService;
      const service = new ActionItemsService(buildSupabaseRequestServiceMock(() => builder), activitiesService, buildStubAlertsService());

      await expect(
        service.update('client-1', 'missing', { status: 'cancelled' }, currentUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('complete', () => {
    it('rejects completing an action item that is already done/cancelled', async () => {
      const doneRow = { ...pendingActionItemRow, status: 'done' };
      const builder = createBuilderMock({ data: doneRow, error: null });
      const activitiesService = {} as unknown as ActivitiesService;
      const service = new ActionItemsService(buildSupabaseRequestServiceMock(() => builder), activitiesService, buildStubAlertsService());

      await expect(service.complete('client-1', 'action-1', {}, currentUser)).rejects.toThrow(
        ConflictException,
      );
    });

    it('marks done without an activity when dto.activity is omitted', async () => {
      const findBuilder = createBuilderMock({ data: pendingActionItemRow, error: null });
      const updatedRow = { ...pendingActionItemRow, status: 'done', completed_activity_id: null };
      const updateBuilder = createBuilderMock({ data: updatedRow, error: null });

      let callCount = 0;
      const fromSpy = vi.fn(() => {
        callCount += 1;
        return callCount === 1 ? findBuilder : updateBuilder;
      });
      const activitiesService = { create: vi.fn() } as unknown as ActivitiesService;
      const service = new ActionItemsService(buildSupabaseRequestServiceMock(fromSpy), activitiesService, buildStubAlertsService());

      const result = await service.complete('client-1', 'action-1', {}, currentUser);

      expect(activitiesService.create).not.toHaveBeenCalled();
      expect(result.activity).toBeNull();
      expect(result.nextActionItem).toBeNull();
      expect(result.actionItem.status).toBe('done');
    });

    it('creates an activity and chains a next action item when both are provided', async () => {
      const findBuilder = createBuilderMock({ data: pendingActionItemRow, error: null });
      const updatedRow = {
        ...pendingActionItemRow,
        status: 'done',
        completed_activity_id: 'activity-99',
      };
      const updateBuilder = createBuilderMock({ data: updatedRow, error: null });
      const nextActionRow = {
        ...pendingActionItemRow,
        id: 'action-2',
        content: '不足エリア情報の確認',
        due_date: '2026-05-22',
        source_activity_id: 'activity-99',
      };
      const insertBuilder = createBuilderMock({ data: nextActionRow, error: null });
      let nextActionInsertedRow: any;
      insertBuilder.insert = (row: unknown) => {
        nextActionInsertedRow = row;
        return insertBuilder;
      };

      const fromCalls: string[] = [];
      const fromSpy = vi.fn((table: string) => {
        fromCalls.push(table);
        if (table === 'action_items') {
          // 1回目: findOne, 2回目: update(complete), 3回目: create(nextAction)
          const actionItemCalls = fromCalls.filter((t) => t === 'action_items').length;
          if (actionItemCalls === 1) return findBuilder;
          if (actionItemCalls === 2) return updateBuilder;
          return insertBuilder;
        }
        return findBuilder;
      });

      const createdActivity = { id: 'activity-99', activityType: 'meeting' };
      const activitiesService = {
        create: vi.fn().mockResolvedValue(createdActivity),
      } as unknown as ActivitiesService;
      const service = new ActionItemsService(buildSupabaseRequestServiceMock(fromSpy), activitiesService, buildStubAlertsService());

      const result = await service.complete(
        'client-1',
        'action-1',
        {
          activity: { activityType: 'meeting', activityDate: '2026-05-20', notes: '商談メモ' },
          nextAction: { content: '不足エリア情報の確認', dueDate: '2026-05-22' },
        },
        currentUser,
      );

      expect(activitiesService.create).toHaveBeenCalledWith(
        'client-1',
        expect.objectContaining({ activityType: 'meeting', activityDate: '2026-05-20' }),
        currentUser,
      );
      expect(result.actionItem.completedActivityId).toBe('activity-99');
      expect(result.nextActionItem?.content).toBe('不足エリア情報の確認');
      expect(result.nextActionItem?.sourceActivityId).toBe('activity-99');
      expect(nextActionInsertedRow.source_activity_id).toBe('activity-99');
    });
  });

  describe('findUpcomingAcrossClients', () => {
    it('maps rows including the client name and filters by due_date/status only', async () => {
      const row = {
        id: 'action-1',
        client_id: 'client-1',
        content: '提案資料のご説明',
        due_date: '2026-05-21',
        assignee: { id: 'user-1', full_name: '藤原 樹' },
        client: { company_name: '南国殖産株式会社' },
      };
      const builder = createBuilderMock({ data: [row], error: null });
      const activitiesService = {} as unknown as ActivitiesService;
      const service = new ActionItemsService(buildSupabaseRequestServiceMock(() => builder), activitiesService, buildStubAlertsService());

      const result = await service.findUpcomingAcrossClients(10);

      expect(result).toEqual([
        {
          id: 'action-1',
          clientId: 'client-1',
          clientName: '南国殖産株式会社',
          content: '提案資料のご説明',
          dueDate: '2026-05-21',
          assignee: { id: 'user-1', fullName: '藤原 樹' },
        },
      ]);
    });
  });

  describe('findOverdueAcrossClients', () => {
    it('uses an inner-joined client embed and filters by office_id only when officeId is provided', async () => {
      const selectCalls: unknown[][] = [];
      const eqCalls: unknown[][] = [];
      const builder: Record<string, unknown> = {};
      for (const method of ['lt', 'order', 'limit'] as const) {
        builder[method] = () => builder;
      }
      builder.select = (...args: unknown[]) => {
        selectCalls.push(args);
        return builder;
      };
      builder.eq = (...args: unknown[]) => {
        eqCalls.push(args);
        return builder;
      };
      // oxlint-disable-next-line unicorn/no-thenable -- supabase-jsのクエリビルダーの仕様を模倣している
      (builder as any).then = (resolve: (v: MockResult) => unknown) => resolve({ data: [], error: null });

      const service = new ActionItemsService(
        buildSupabaseRequestServiceMock(() => builder),
        {} as unknown as ActivitiesService,
        buildStubAlertsService(),
      );

      await service.findOverdueAcrossClients({ officeId: 'office-1' });

      expect(selectCalls[0][0]).toContain('clients!inner');
      expect(eqCalls).toEqual(expect.arrayContaining([['client.office_id', 'office-1']]));
    });

    it('does not filter by office when officeId is omitted', async () => {
      const selectCalls: unknown[][] = [];
      const builder: Record<string, unknown> = {};
      for (const method of ['eq', 'lt', 'order', 'limit'] as const) {
        builder[method] = () => builder;
      }
      builder.select = (...args: unknown[]) => {
        selectCalls.push(args);
        return builder;
      };
      // oxlint-disable-next-line unicorn/no-thenable -- supabase-jsのクエリビルダーの仕様を模倣している
      (builder as any).then = (resolve: (v: MockResult) => unknown) => resolve({ data: [], error: null });

      const service = new ActionItemsService(
        buildSupabaseRequestServiceMock(() => builder),
        {} as unknown as ActivitiesService,
        buildStubAlertsService(),
      );

      await service.findOverdueAcrossClients({});

      expect(selectCalls[0][0]).not.toContain('!inner');
    });
  });
});
