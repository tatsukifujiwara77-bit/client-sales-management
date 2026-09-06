export const ALERT_TYPES = ['overdue', 'due_today', 'due_this_week', 'no_visit'] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

export const ALERT_STATUSES = ['open', 'dismissed', 'resolved'] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export interface Alert {
  id: string;
  clientId: string;
  clientName: string;
  /** そのクライアントのメイン担当営業（ダッシュボード「3ヶ月訪問なしクライアント」カード表示用） */
  primaryAssignee: { id: string; fullName: string } | null;
  actionItemId: string | null;
  alertType: AlertType;
  targetDate: string | null;
  status: AlertStatus;
  createdAt: string;
  updatedAt: string;
}

/** ダッシュボードのアラート件数（設計書 7.2 / 11.4） */
export interface AlertCounts {
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  noVisit: number;
}

interface RawAssignmentEmbed {
  is_primary: boolean;
  profile: { id: string; full_name: string } | null;
}

export interface RawAlertRow {
  id: string;
  client_id: string;
  action_item_id: string | null;
  alert_type: AlertType;
  target_date: string | null;
  status: AlertStatus;
  created_at: string;
  updated_at: string;
  client: { company_name: string; assignments: RawAssignmentEmbed[] | null } | null;
}

export function mapAlertRow(row: RawAlertRow): Alert {
  const primaryAssignment = row.client?.assignments?.find((a) => a.is_primary && a.profile);
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client?.company_name ?? '不明',
    primaryAssignee: primaryAssignment?.profile
      ? { id: primaryAssignment.profile.id, fullName: primaryAssignment.profile.full_name }
      : null,
    actionItemId: row.action_item_id,
    alertType: row.alert_type,
    targetDate: row.target_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
