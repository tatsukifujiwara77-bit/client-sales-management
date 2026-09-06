import { DashboardService } from './dashboard.service.js';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import type { ClientsService } from '../clients/clients.service.js';
import type { ActivitiesService } from '../activities/activities.service.js';
import type { ActionItemsService } from '../action-items/action-items.service.js';
import type { AlertsService } from '../alerts/alerts.service.js';

interface MockResult {
  data: unknown;
  error: unknown;
  count?: number;
}

function createBuilderMock(result: MockResult) {
  const chainMethods = ['select', 'eq', 'gte', 'lte'] as const;
  const builder: Record<string, unknown> = {};
  for (const method of chainMethods) {
    builder[method] = (..._args: unknown[]) => builder;
  }
  // oxlint-disable-next-line unicorn/no-thenable -- supabase-jsのクエリビルダーの仕様を模倣している
  (builder as any).then = (resolve: (v: MockResult) => unknown) => resolve(result);
  return builder;
}

describe('DashboardService', () => {
  it('composes KPIs, pipeline, temperature breakdown, alerts and recent activity into one response', async () => {
    // すべての count クエリ・生データクエリに対して、常に count:2, data:[] を返す単純なモック
    const genericBuilder = createBuilderMock({ data: [], error: null, count: 2 });
    const supabaseRequestService = {
      getClient: () => ({ from: () => genericBuilder }),
    } as unknown as SupabaseRequestService;

    const clientsService = {
      getPipeline: vi.fn().mockResolvedValue([
        { stage: { id: 'stage-1', name: '未接触', isClosed: false }, count: 3, clients: [] },
        { stage: { id: 'stage-2', name: '営業終了', isClosed: true }, count: 1, clients: [] },
      ]),
    } as unknown as ClientsService;

    const activitiesService = {
      findRecentAcrossClients: vi.fn().mockResolvedValue([{ id: 'activity-1' }]),
    } as unknown as ActivitiesService;

    const actionItemsService = {
      findUpcomingAcrossClients: vi.fn().mockResolvedValue([{ id: 'action-1' }]),
    } as unknown as ActionItemsService;

    const alertsService = {
      getCounts: vi.fn().mockResolvedValue({ overdue: 2, dueToday: 3, dueThisWeek: 8, noVisit: 5 }),
      list: vi.fn().mockResolvedValue({ items: [{ id: 'alert-1' }], total: 1, page: 1, pageSize: 50 }),
    } as unknown as AlertsService;

    const service = new DashboardService(
      supabaseRequestService,
      clientsService,
      activitiesService,
      actionItemsService,
      alertsService,
    );

    const result = await service.getDashboard();

    expect(result.pipeline).toEqual([
      { stageId: 'stage-1', stageName: '未接触', isClosed: false, count: 3 },
      { stageId: 'stage-2', stageName: '営業終了', isClosed: true, count: 1 },
    ]);
    expect(result.alertCounts).toEqual({ overdue: 2, dueToday: 3, dueThisWeek: 8, noVisit: 5 });
    expect(result.recentActivities).toEqual([{ id: 'activity-1' }]);
    expect(result.upcomingActionItems).toEqual([{ id: 'action-1' }]);
    expect(result.noVisitClients).toEqual([{ id: 'alert-1' }]);
    expect(result.kpis.visits.count).toBe(2);
    expect(result.temperatureBreakdown).toEqual({ high: 2, medium: 2, low: 2, unknown: 2 });
    expect(alertsService.list).toHaveBeenCalledWith(
      expect.objectContaining({ alertType: 'no_visit', status: 'open' }),
    );
  });
});
