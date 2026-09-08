import { ClientActivityCacheService } from './client-activity-cache.service.js';
import { SupabaseRequestService } from '../../supabase/supabase-request.service.js';
import type { AlertsService } from '../../alerts/alerts.service.js';

function buildStubAlertsService(): AlertsService {
  return { recomputeForClient: vi.fn().mockResolvedValue(undefined) } as unknown as AlertsService;
}

interface MockResult {
  data: unknown;
  error: unknown;
}

/**
 * activities/client_notesの4種の問い合わせを、呼び出し順に沿って個別の結果に
 * 振り分けるための簡易モック（select().eq(...).order(...).limit(1).maybeSingle() の
 * 形しか使わないため、テーブル名とeqの条件だけを見て結果を選ぶ）。
 */
function buildSupabaseMock(params: {
  lastActivity: MockResult;
  lastVisitActivity: MockResult;
  lastNote: MockResult;
  lastVisitNote: MockResult;
  clientsUpdate?: MockResult;
}) {
  const updateSpy = vi.fn();
  const clientsUpdateResult = params.clientsUpdate ?? { data: null, error: null };

  const fromSpy = vi.fn((table: string) => {
    if (table === 'clients') {
      const builder: Record<string, unknown> = {
        update: (payload: unknown) => {
          updateSpy(payload);
          return builder;
        },
        eq: () => builder,
      };
      // oxlint-disable-next-line unicorn/no-thenable -- supabase-jsのクエリビルダーを模倣している
      (builder as any).then = (resolve: (v: MockResult) => unknown) => resolve(clientsUpdateResult);
      return builder;
    }

    // activities/client_notes: eqの引数列を見て、どの問い合わせかを判定する
    let eqArgs: unknown[][] = [];
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: (...args: unknown[]) => {
        eqArgs.push(args);
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      maybeSingle: () => {
        const isVisitFilter = eqArgs.some(
          ([field, value]) =>
            (field === 'activity_type' && value === 'visit') || (field === 'meeting_type' && value === 'visit'),
        );
        if (table === 'activities') {
          return isVisitFilter ? params.lastVisitActivity : params.lastActivity;
        }
        return isVisitFilter ? params.lastVisitNote : params.lastNote;
      },
    };
    return builder;
  });

  const supabaseRequestService = { getClient: () => ({ from: fromSpy }) } as unknown as SupabaseRequestService;
  return { supabaseRequestService, updateSpy };
}

describe('ClientActivityCacheService', () => {
  it('takes the later of activities and client_notes for last_activity_at/last_visited_at', async () => {
    const { supabaseRequestService, updateSpy } = buildSupabaseMock({
      lastActivity: { data: { activity_date: '2026-05-10' }, error: null },
      lastVisitActivity: { data: { activity_date: '2026-04-01' }, error: null },
      lastNote: { data: { created_at: '2026-05-20T00:00:00Z' }, error: null },
      lastVisitNote: { data: { created_at: '2026-05-20T00:00:00Z' }, error: null },
    });
    const alertsService = buildStubAlertsService();
    const service = new ClientActivityCacheService(supabaseRequestService, alertsService);

    await service.refresh('client-1');

    expect(updateSpy).toHaveBeenCalledWith({ last_activity_at: '2026-05-20', last_visited_at: '2026-05-20' });
    expect(alertsService.recomputeForClient).toHaveBeenCalledWith('client-1');
  });

  it('falls back to activities alone when there are no client_notes yet', async () => {
    const { supabaseRequestService, updateSpy } = buildSupabaseMock({
      lastActivity: { data: { activity_date: '2026-05-10' }, error: null },
      lastVisitActivity: { data: { activity_date: '2026-05-10' }, error: null },
      lastNote: { data: null, error: null },
      lastVisitNote: { data: null, error: null },
    });
    const service = new ClientActivityCacheService(supabaseRequestService, buildStubAlertsService());

    await service.refresh('client-1');

    expect(updateSpy).toHaveBeenCalledWith({ last_activity_at: '2026-05-10', last_visited_at: '2026-05-10' });
  });

  it('picks up a visit recorded only via a 商談メモ(client_notes) entry', async () => {
    const { supabaseRequestService, updateSpy } = buildSupabaseMock({
      lastActivity: { data: null, error: null },
      lastVisitActivity: { data: null, error: null },
      lastNote: { data: { created_at: '2026-06-01T09:00:00Z' }, error: null },
      lastVisitNote: { data: { created_at: '2026-06-01T09:00:00Z' }, error: null },
    });
    const service = new ClientActivityCacheService(supabaseRequestService, buildStubAlertsService());

    await service.refresh('client-1');

    expect(updateSpy).toHaveBeenCalledWith({ last_activity_at: '2026-06-01', last_visited_at: '2026-06-01' });
  });

  it('does not throw and still recomputes alerts when reading fails', async () => {
    const { supabaseRequestService, updateSpy } = buildSupabaseMock({
      lastActivity: { data: null, error: { message: 'boom' } },
      lastVisitActivity: { data: null, error: null },
      lastNote: { data: null, error: null },
      lastVisitNote: { data: null, error: null },
    });
    const alertsService = buildStubAlertsService();
    const service = new ClientActivityCacheService(supabaseRequestService, alertsService);

    await expect(service.refresh('client-1')).resolves.toBeUndefined();
    expect(updateSpy).not.toHaveBeenCalled();
    expect(alertsService.recomputeForClient).toHaveBeenCalledWith('client-1');
  });
});
