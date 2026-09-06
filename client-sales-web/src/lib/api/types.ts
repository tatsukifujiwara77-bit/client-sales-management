/**
 * NestJS API（client-sales-api）のレスポンス型。
 * バックエンド側の型定義（src/**\/*.types.ts）と対応させている。
 */

export type UserRole = 'admin' | 'office_manager' | 'sales_rep';

export interface MeResponse {
  id: string;
  email: string | null;
  fullName: string;
  role: UserRole;
  office: { id: string; name: string } | null;
}

export type Temperature = 'high' | 'medium' | 'low' | 'unknown';
export type ActivityType = 'visit' | 'meeting' | 'call' | 'email' | 'online' | 'other';
export type AlertType = 'overdue' | 'due_today' | 'due_this_week' | 'no_visit';
export type AlertStatus = 'open' | 'dismissed' | 'resolved';

export interface UserRef {
  id: string;
  fullName: string;
}

export interface KpiMetric {
  count: number;
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

export interface AlertCounts {
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  noVisit: number;
}

export interface ActivityWithClient {
  id: string;
  clientId: string;
  clientName: string;
  activityType: ActivityType;
  activityDate: string;
  notes: string | null;
  owner: UserRef;
}

export interface ActionItemWithClient {
  id: string;
  clientId: string;
  clientName: string;
  content: string;
  dueDate: string;
  assignee: UserRef;
}

export interface Alert {
  id: string;
  clientId: string;
  clientName: string;
  primaryAssignee: UserRef | null;
  actionItemId: string | null;
  alertType: AlertType;
  targetDate: string | null;
  status: AlertStatus;
  createdAt: string;
  updatedAt: string;
}

/** GET /alerts, GET /clients/:clientId/alerts のレスポンス（設計書 7.2） */
export interface AlertsDashboardResponse {
  counts: AlertCounts;
  alerts: PagedResult<Alert>;
}

export interface DashboardResponse {
  kpis: DashboardKpis;
  pipeline: PipelineStageSummary[];
  temperatureBreakdown: TemperatureBreakdown;
  alertCounts: AlertCounts;
  recentActivities: ActivityWithClient[];
  upcomingActionItems: ActionItemWithClient[];
  noVisitClients: Alert[];
}

export interface MapClientPin {
  id: string;
  companyName: string;
  lat: number;
  lng: number;
  address: string | null;
  temperature: Temperature;
  salesStage: { id: string; name: string; isClosed: boolean };
  office: { id: string; name: string } | null;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Office {
  id: string;
  name: string;
  prefecture: string | null;
  address: string | null;
}

export interface UserSummary {
  id: string;
  fullName: string;
  role: UserRole;
  officeId: string | null;
  isActive: boolean;
}

export interface SalesStage {
  id: string;
  name: string;
  sortOrder: number;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

/** アラートのしきい値等、設定値（設計書 25. アラート設定） */
export interface AlertSetting {
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

export interface NextActionSummary {
  id: string;
  content: string;
  dueDate: string;
  status: 'pending' | 'done' | 'cancelled';
}

/** GET /clients の一覧表示に必要な最小限の項目（設計書 11.4 準拠） */
export interface ClientListItem {
  id: string;
  companyName: string;
  office: { id: string; name: string } | null;
  salesStage: { id: string; name: string; isClosed: boolean };
  temperature: Temperature;
  address: string | null;
  lastVisitedAt: string | null;
  lastActivityAt: string | null;
  primaryAssignee: UserRef | null;
  nextAction: NextActionSummary | null;
  updatedAt: string;
}

/** GET /clients/pipeline のカラム1件分（営業進捗Kanban用） */
export interface PipelineColumn {
  stage: { id: string; name: string; isClosed: boolean };
  /** そのフェーズに該当する総件数（clients の表示上限とは独立） */
  count: number;
  clients: ClientListItem[];
}

export interface ClientAssignmentItem {
  userId: string;
  fullName: string;
  isPrimary: boolean;
}

/** GET /clients/:id の詳細 */
export interface ClientDetail extends ClientListItem {
  lat: number | null;
  lng: number | null;
  characteristics: string | null;
  cautionNotes: string | null;
  discoveredBy: UserRef | null;
  lossReason: { id: string; name: string } | null;
  assignments: ClientAssignmentItem[];
  createdAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface ClientContact {
  id: string;
  clientId: string;
  name: string;
  position: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  isKeyPerson: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientNote {
  id: string;
  clientId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

/** GET /clients/:id/dossier（クライアントカルテ） */
export interface ClientDossier {
  client: ClientDetail;
  contacts: ClientContact[];
  notes: ClientNote[];
  latestActivity: { id: string; activityType: ActivityType; activityDate: string; notes: string | null } | null;
  nextActionItem: NextActionSummary | null;
}

export type NotifyBefore = '1_day' | '3_days' | '1_week' | 'none';
export type ActionItemStatus = 'pending' | 'done' | 'cancelled';

export interface Activity {
  id: string;
  clientId: string;
  activityType: ActivityType;
  activityDate: string;
  owner: UserRef;
  participants: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActionItem {
  id: string;
  clientId: string;
  sourceActivityId: string | null;
  content: string;
  dueDate: string;
  notifyBefore: NotifyBefore;
  assignee: UserRef;
  status: ActionItemStatus;
  completedAt: string | null;
  completedActivityId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompleteActionItemResult {
  actionItem: ActionItem;
  activity: Activity | null;
  nextActionItem: ActionItem | null;
}
