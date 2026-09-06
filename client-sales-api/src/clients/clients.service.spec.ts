import { NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service.js';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import type { ClientContactsService } from '../client-contacts/client-contacts.service.js';
import type { ClientNotesService } from '../client-notes/client-notes.service.js';
import type { ActivitiesService } from '../activities/activities.service.js';
import type { ActionItemsService } from '../action-items/action-items.service.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

function buildStubContactsService(contacts: unknown[] = []): ClientContactsService {
  return { list: vi.fn().mockResolvedValue(contacts) } as unknown as ClientContactsService;
}

function buildStubNotesService(notes: unknown[] = []): ClientNotesService {
  return { list: vi.fn().mockResolvedValue(notes) } as unknown as ClientNotesService;
}

function buildStubActivitiesService(latest: unknown = null): ActivitiesService {
  return { findLatestForClient: vi.fn().mockResolvedValue(latest) } as unknown as ActivitiesService;
}

function buildStubActionItemsService(next: unknown = null): ActionItemsService {
  return { findNextPendingForClient: vi.fn().mockResolvedValue(next) } as unknown as ActionItemsService;
}

interface MockResult {
  data: unknown;
  error: unknown;
  count?: number;
}

/**
 * supabase-js のクエリビルダーは「メソッドチェーン可能」かつ「thenable(await可能)」。
 * このモックはどの段階で await されても同じ result を返す。
 */
function createBuilderMock(result: MockResult) {
  const calls: Record<string, unknown[][]> = {};
  const chainMethods = [
    'select',
    'eq',
    'or',
    'order',
    'range',
    'limit',
    'in',
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

function buildSupabaseRequestServiceMock(fromImpl: (table: string) => unknown): SupabaseRequestService {
  return {
    getClient: () => ({ from: fromImpl }),
  } as unknown as SupabaseRequestService;
}

const currentUser: AuthUser = {
  id: 'user-1',
  email: 'user@example.com',
  fullName: '藤原 樹',
  role: 'sales_rep',
  officeId: 'office-1',
  isActive: true,
};

describe('ClientsService', () => {
  describe('list', () => {
    it('applies filters, search, sort and pagination, and maps rows', async () => {
      const rawRow = {
        id: 'client-1',
        company_name: '南国殖産株式会社',
        temperature: 'high',
        address: '福岡市中央区',
        last_visited_at: '2026-05-20',
        last_activity_at: '2026-05-20',
        updated_at: '2026-05-20T00:00:00Z',
        office: { id: 'office-1', name: '九州営業部' },
        sales_stage: { id: 'stage-1', name: '商談', is_closed: false },
        assignments: [{ user_id: 'user-1', is_primary: true, profile: { id: 'user-1', full_name: '藤原 樹' } }],
      };
      const { builder, calls } = createBuilderMock({ data: [rawRow], error: null, count: 1 });
      const fromSpy = vi.fn().mockReturnValue(builder);
      const service = new ClientsService(
        buildSupabaseRequestServiceMock(fromSpy),
        buildStubContactsService(),
        buildStubNotesService(),
        buildStubActivitiesService(),
        buildStubActionItemsService(),
      );

      const result = await service.list({
        search: '南国',
        officeId: 'office-1',
        isClosed: false,
        page: 1,
        pageSize: 20,
      });

      expect(fromSpy).toHaveBeenCalledWith('clients');
      expect(calls.eq).toEqual(
        expect.arrayContaining([
          ['office_id', 'office-1'],
          ['sales_stage.is_closed', false],
        ]),
      );
      expect(calls.or[0][0]).toContain('南国');
      expect(result.total).toBe(1);
      expect(result.items[0]).toMatchObject({
        id: 'client-1',
        companyName: '南国殖産株式会社',
        primaryAssignee: { id: 'user-1', fullName: '藤原 樹' },
      });
    });

    it('uses an inner-joined assignments embed only when assignedTo is provided', async () => {
      const { builder, calls } = createBuilderMock({ data: [], error: null, count: 0 });
      const fromSpy = vi.fn().mockReturnValue(builder);
      const service = new ClientsService(
        buildSupabaseRequestServiceMock(fromSpy),
        buildStubContactsService(),
        buildStubNotesService(),
        buildStubActivitiesService(),
        buildStubActionItemsService(),
      );

      await service.list({ assignedTo: 'user-2', page: 1, pageSize: 20 });

      expect(calls.select[0][0]).toContain('client_assignments!inner');
      expect(calls.eq).toEqual(expect.arrayContaining([['assignments.user_id', 'user-2']]));
    });

    it('attaches each client\'s earliest pending action item in a single batch query', async () => {
      const clientRow = {
        id: 'client-1',
        company_name: '南国殖産株式会社',
        temperature: 'high',
        address: null,
        last_visited_at: null,
        last_activity_at: null,
        updated_at: '2026-05-20T00:00:00Z',
        office: null,
        sales_stage: { id: 'stage-1', name: '商談', is_closed: false },
        assignments: [],
      };
      const actionRows = [
        { client_id: 'client-1', id: 'action-2', content: '後の予定', due_date: '2026-06-01' },
        { client_id: 'client-1', id: 'action-1', content: '先の予定', due_date: '2026-05-25' },
      ];

      const clientsBuilder = createBuilderMock({ data: [clientRow], error: null, count: 1 }).builder;
      const actionItemsBuilder = createBuilderMock({ data: actionRows, error: null }).builder;
      const fromSpy = vi.fn((table: string) => (table === 'action_items' ? actionItemsBuilder : clientsBuilder));

      const service = new ClientsService(
        buildSupabaseRequestServiceMock(fromSpy),
        buildStubContactsService(),
        buildStubNotesService(),
        buildStubActivitiesService(),
        buildStubActionItemsService(),
      );

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(fromSpy).toHaveBeenCalledWith('action_items');
      // 実装は「クエリ結果の先頭行を採用する」だけで、自前の並べ替えはしない
      // （実際の昇順ソートはDB側の.order('due_date')に委ねる設計のため、
      //  このモックではDBの並び順を模して意図的にaction-2を先頭に置いている）
      expect(result.items[0].nextAction).toEqual({
        id: 'action-2',
        content: '後の予定',
        dueDate: '2026-06-01',
        status: 'pending',
      });
    });
  });

  describe('findOne', () => {
    it('returns the mapped detail when found', async () => {
      const rawRow = {
        id: 'client-1',
        company_name: '南国殖産株式会社',
        temperature: 'high',
        address: '福岡市中央区',
        last_visited_at: '2026-05-20',
        last_activity_at: '2026-05-20',
        updated_at: '2026-05-20T00:00:00Z',
        lat: null,
        lng: null,
        characteristics: null,
        caution_notes: null,
        created_at: '2026-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1',
        office: { id: 'office-1', name: '九州営業部' },
        sales_stage: { id: 'stage-1', name: '商談', is_closed: false },
        loss_reason: null,
        discovered_by_profile: { id: 'user-1', full_name: '藤原 樹' },
        assignments: [],
      };
      const { builder } = createBuilderMock({ data: rawRow, error: null });
      const service = new ClientsService(
        buildSupabaseRequestServiceMock(() => builder),
        buildStubContactsService(),
        buildStubNotesService(),
        buildStubActivitiesService(),
        buildStubActionItemsService(),
      );

      const result = await service.findOne('client-1');
      expect(result.id).toBe('client-1');
      expect(result.discoveredBy).toEqual({ id: 'user-1', fullName: '藤原 樹' });
    });

    it('throws NotFoundException when no row is returned (RLSにより非公開の場合を含む)', async () => {
      const { builder } = createBuilderMock({ data: null, error: null });
      const service = new ClientsService(
        buildSupabaseRequestServiceMock(() => builder),
        buildStubContactsService(),
        buildStubNotesService(),
        buildStubActivitiesService(),
        buildStubActionItemsService(),
      );

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('defaults discovered_by to the current user when not provided', async () => {
      const rawRow = {
        id: 'client-1',
        company_name: '株式会社ABC',
        temperature: 'unknown',
        address: null,
        last_visited_at: null,
        last_activity_at: null,
        updated_at: '2026-05-20T00:00:00Z',
        lat: null,
        lng: null,
        characteristics: null,
        caution_notes: null,
        created_at: '2026-05-20T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1',
        office: null,
        sales_stage: { id: 'stage-1', name: '未接触', is_closed: false },
        loss_reason: null,
        discovered_by_profile: { id: 'user-1', full_name: '藤原 樹' },
        assignments: [],
      };
      const { builder, calls } = createBuilderMock({ data: rawRow, error: null });
      let insertedRow: any;
      builder.insert = (row: unknown) => {
        insertedRow = row;
        return builder;
      };
      const service = new ClientsService(
        buildSupabaseRequestServiceMock(() => builder),
        buildStubContactsService(),
        buildStubNotesService(),
        buildStubActivitiesService(),
        buildStubActionItemsService(),
      );

      await service.create(
        { companyName: '株式会社ABC', officeId: 'office-1', salesStageId: 'stage-1' },
        currentUser,
      );

      expect(insertedRow.discovered_by).toBe('user-1');
      expect(insertedRow.created_by).toBe('user-1');
      expect(insertedRow.updated_by).toBe('user-1');
      expect(calls.single).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the row does not exist or is not accessible', async () => {
      const { builder } = createBuilderMock({ data: null, error: null });
      const service = new ClientsService(
        buildSupabaseRequestServiceMock(() => builder),
        buildStubContactsService(),
        buildStubNotesService(),
        buildStubActivitiesService(),
        buildStubActionItemsService(),
      );

      await expect(service.update('missing', {}, currentUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('assign', () => {
    it('unsets the previous primary assignment before inserting a new primary one', async () => {
      const calledMethods: string[] = [];
      const listBuilder = createBuilderMock({ data: [], error: null }).builder;

      const fromSpy = vi.fn((table: string) => {
        if (table !== 'client_assignments') return listBuilder;
        const b: any = {};
        b.update = (..._args: unknown[]) => {
          calledMethods.push('update');
          return b;
        };
        b.insert = (..._args: unknown[]) => {
          calledMethods.push('insert');
          return b;
        };
        b.eq = () => b;
        b.select = () => b;
        // oxlint-disable-next-line unicorn/no-thenable -- supabase-jsのクエリビルダー自体がthenableな仕様のため、模倣している
        b.then = (resolve: (v: MockResult) => unknown) => resolve({ data: null, error: null });
        return b;
      });

      const service = new ClientsService(
        buildSupabaseRequestServiceMock(fromSpy),
        buildStubContactsService(),
        buildStubNotesService(),
        buildStubActivitiesService(),
        buildStubActionItemsService(),
      );
      await service.assign('client-1', { userId: 'user-2', isPrimary: true });

      expect(calledMethods).toEqual(['update', 'insert']);
    });
  });

  describe('getDossier', () => {
    it('aggregates client detail, contacts, notes, latest activity and next action item', async () => {
      const clientDetailRow = {
        id: 'client-1',
        company_name: '南国殖産株式会社',
        temperature: 'high',
        address: '福岡市中央区',
        last_visited_at: '2026-05-20',
        last_activity_at: '2026-05-20',
        updated_at: '2026-05-20T00:00:00Z',
        lat: null,
        lng: null,
        characteristics: null,
        caution_notes: null,
        created_at: '2026-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1',
        office: { id: 'office-1', name: '九州営業部' },
        sales_stage: { id: 'stage-1', name: '商談', is_closed: false },
        loss_reason: null,
        discovered_by_profile: { id: 'user-1', full_name: '藤原 樹' },
        assignments: [],
      };
      const latestActivitySummary = {
        id: 'activity-1',
        activityType: 'meeting',
        activityDate: '2026-05-20',
        notes: '九州エリアの採用状況について商談',
      };
      const nextActionItemSummary = {
        id: 'action-1',
        content: '提案資料のご説明',
        dueDate: '2026-05-21',
        status: 'pending',
      };

      const clientBuilder = createBuilderMock({ data: clientDetailRow, error: null }).builder;
      const fromSpy = vi.fn(() => clientBuilder);

      const contactsService = buildStubContactsService([{ id: 'contact-1', name: '髙江洲様' }]);
      const notesService = buildStubNotesService([{ id: 'note-1', content: '重要な取引先' }]);
      const activitiesService = buildStubActivitiesService(latestActivitySummary);
      const actionItemsService = buildStubActionItemsService(nextActionItemSummary);
      const service = new ClientsService(
        buildSupabaseRequestServiceMock(fromSpy),
        contactsService,
        notesService,
        activitiesService,
        actionItemsService,
      );

      const dossier = await service.getDossier('client-1');

      expect(dossier.client.id).toBe('client-1');
      expect(dossier.contacts).toEqual([{ id: 'contact-1', name: '髙江洲様' }]);
      expect(dossier.notes).toEqual([{ id: 'note-1', content: '重要な取引先' }]);
      expect(dossier.latestActivity).toEqual(latestActivitySummary);
      expect(dossier.nextActionItem).toEqual(nextActionItemSummary);
      expect(contactsService.list).toHaveBeenCalledWith('client-1');
      expect(notesService.list).toHaveBeenCalledWith('client-1');
      expect(activitiesService.findLatestForClient).toHaveBeenCalledWith('client-1');
      expect(actionItemsService.findNextPendingForClient).toHaveBeenCalledWith('client-1');
    });
  });

  describe('getPipeline', () => {
    it('returns one column per sales stage, including empty ones, with counts and client cards', async () => {
      const stagesBuilder = createBuilderMock({
        data: [
          { id: 'stage-1', name: '未接触', is_closed: false },
          { id: 'stage-2', name: '契約・取引中', is_closed: false },
        ],
        error: null,
      }).builder;

      const clientRow = {
        id: 'client-1',
        company_name: '南国殖産株式会社',
        temperature: 'high',
        address: '福岡市中央区',
        last_visited_at: null,
        last_activity_at: null,
        updated_at: '2026-05-20T00:00:00Z',
        office: null,
        sales_stage: { id: 'stage-1', name: '未接触', is_closed: false },
        assignments: [],
      };

      let clientsCallCount = 0;
      const fromSpy = vi.fn((table: string) => {
        if (table === 'sales_stages') return stagesBuilder;
        clientsCallCount += 1;
        // 呼び出し順: stage1-count, stage1-list, stage2-count, stage2-list
        if (clientsCallCount === 1) return createBuilderMock({ data: null, error: null, count: 1 }).builder;
        if (clientsCallCount === 2) return createBuilderMock({ data: [clientRow], error: null }).builder;
        if (clientsCallCount === 3) return createBuilderMock({ data: null, error: null, count: 0 }).builder;
        return createBuilderMock({ data: [], error: null }).builder;
      });

      const service = new ClientsService(
        buildSupabaseRequestServiceMock(fromSpy),
        buildStubContactsService(),
        buildStubNotesService(),
        buildStubActivitiesService(),
        buildStubActionItemsService(),
      );

      const columns = await service.getPipeline({ perColumnLimit: 50 });

      expect(columns).toHaveLength(2);
      expect(columns[0]).toMatchObject({ stage: { id: 'stage-1', name: '未接触' }, count: 1 });
      expect(columns[0].clients).toHaveLength(1);
      expect(columns[1]).toMatchObject({ stage: { id: 'stage-2', name: '契約・取引中' }, count: 0 });
      expect(columns[1].clients).toHaveLength(0);
    });
  });
});
