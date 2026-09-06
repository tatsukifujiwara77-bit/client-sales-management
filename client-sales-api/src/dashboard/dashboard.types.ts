import type { ActivityWithClient } from '../activities/activities.types.js';
import type { ActionItemWithClient } from '../action-items/action-items.types.js';
import type { Alert, AlertCounts } from '../alerts/alerts.types.js';

export interface KpiMetric {
  count: number;
  /** 前月比(%)。前月が0件で算出できない場合は null。 */
  changePercent: number | null;
}

export interface DashboardKpis {
  visits: KpiMetric;
  meetings: KpiMetric;
  calls: KpiMetric;
  newClients: KpiMetric;
}

export interface PipelineStageSummary {
  stageId: string;
  stageName: string;
  isClosed: boolean;
  count: number;
}

export interface TemperatureBreakdown {
  high: number;
  medium: number;
  low: number;
  unknown: number;
}

/** GET /dashboard のレスポンス（設計書 11.4「ダッシュボード」） */
export interface DashboardResponse {
  kpis: DashboardKpis;
  pipeline: PipelineStageSummary[];
  temperatureBreakdown: TemperatureBreakdown;
  alertCounts: AlertCounts;
  recentActivities: ActivityWithClient[];
  upcomingActionItems: ActionItemWithClient[];
  noVisitClients: Alert[];
}
