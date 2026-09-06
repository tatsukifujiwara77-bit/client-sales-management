import { Injectable } from '@nestjs/common';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import { throwIfSupabaseError } from '../common/supabase/supabase-error.util.js';
import { ClientsService } from '../clients/clients.service.js';
import { ActivitiesService } from '../activities/activities.service.js';
import { ActionItemsService } from '../action-items/action-items.service.js';
import { AlertsService } from '../alerts/alerts.service.js';
import { currentMonthRange, percentChange, previousMonthRange, type DateRange } from './date-range.util.js';
import type {
  DashboardKpis,
  DashboardResponse,
  KpiMetric,
  PipelineStageSummary,
  TemperatureBreakdown,
} from './dashboard.types.js';

const TEMPERATURES = ['high', 'medium', 'low', 'unknown'] as const;

@Injectable()
export class DashboardService {
  constructor(
    private readonly supabaseRequestService: SupabaseRequestService,
    private readonly clientsService: ClientsService,
    private readonly activitiesService: ActivitiesService,
    private readonly actionItemsService: ActionItemsService,
    private readonly alertsService: AlertsService,
  ) {}

  async getDashboard(): Promise<DashboardResponse> {
    const [kpis, pipeline, temperatureBreakdown, alertCounts, recentActivities, upcomingActionItems, noVisit] =
      await Promise.all([
        this.getKpis(),
        this.getPipelineSummary(),
        this.getTemperatureBreakdown(),
        this.alertsService.getCounts(),
        this.activitiesService.findRecentAcrossClients(10),
        this.actionItemsService.findUpcomingAcrossClients(10),
        this.alertsService.list({ alertType: 'no_visit', status: 'open', page: 1, pageSize: 50 }),
      ]);

    return {
      kpis,
      pipeline,
      temperatureBreakdown,
      alertCounts,
      recentActivities,
      upcomingActionItems,
      noVisitClients: noVisit.items,
    };
  }

  /** 今月の営業活動（訪問/商談/電話/新規開拓）と前月比（設計書 11.4「ダッシュボード」上部KPI） */
  private async getKpis(): Promise<DashboardKpis> {
    const current = currentMonthRange();
    const previous = previousMonthRange();

    const [visits, meetings, calls, newClients] = await Promise.all([
      this.buildActivityKpi('visit', current, previous),
      this.buildActivityKpi('meeting', current, previous),
      this.buildActivityKpi('call', current, previous),
      this.buildNewClientsKpi(current, previous),
    ]);

    return { visits, meetings, calls, newClients };
  }

  private async buildActivityKpi(
    activityType: 'visit' | 'meeting' | 'call',
    current: DateRange,
    previous: DateRange,
  ): Promise<KpiMetric> {
    const client = this.supabaseRequestService.getClient();
    const countInRange = async (range: DateRange): Promise<number> => {
      const { count, error } = await client
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('activity_type', activityType)
        .gte('activity_date', range.start)
        .lte('activity_date', range.end);
      throwIfSupabaseError(error, { entityName: 'Activity' });
      return count ?? 0;
    };

    const [currentCount, previousCount] = await Promise.all([countInRange(current), countInRange(previous)]);
    return { count: currentCount, changePercent: percentChange(currentCount, previousCount) };
  }

  private async buildNewClientsKpi(current: DateRange, previous: DateRange): Promise<KpiMetric> {
    const client = this.supabaseRequestService.getClient();
    const countInRange = async (range: DateRange): Promise<number> => {
      const { count, error } = await client
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', `${range.start}T00:00:00.000Z`)
        .lte('created_at', `${range.end}T23:59:59.999Z`);
      throwIfSupabaseError(error, { entityName: 'Client' });
      return count ?? 0;
    };

    const [currentCount, previousCount] = await Promise.all([countInRange(current), countInRange(previous)]);
    return { count: currentCount, changePercent: percentChange(currentCount, previousCount) };
  }

  /** 営業進捗パイプライン（フェーズ別件数）。カード一覧はSTEP12の /clients/pipeline を使う。 */
  private async getPipelineSummary(): Promise<PipelineStageSummary[]> {
    const columns = await this.clientsService.getPipeline({ perColumnLimit: 0 });
    return columns.map((column) => ({
      stageId: column.stage.id,
      stageName: column.stage.name,
      isClosed: column.stage.isClosed,
      count: column.count,
    }));
  }

  private async getTemperatureBreakdown(): Promise<TemperatureBreakdown> {
    const client = this.supabaseRequestService.getClient();
    const countFor = async (temperature: (typeof TEMPERATURES)[number]): Promise<number> => {
      const { count, error } = await client
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('temperature', temperature);
      throwIfSupabaseError(error, { entityName: 'Client' });
      return count ?? 0;
    };

    const [high, medium, low, unknown] = await Promise.all(TEMPERATURES.map(countFor));
    return { high, medium, low, unknown };
  }
}
