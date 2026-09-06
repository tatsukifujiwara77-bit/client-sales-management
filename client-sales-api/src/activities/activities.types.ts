import type { ActivityType } from './dto/create-activity.dto.js';

export type { ActivityType };

export interface ActivityOwnerRef {
  id: string;
  fullName: string;
}

export interface Activity {
  id: string;
  clientId: string;
  activityType: ActivityType;
  activityDate: string;
  owner: ActivityOwnerRef;
  participants: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** クライアントカルテ（clients/:id/dossier）で使う軽量な要約 */
export interface LatestActivitySummary {
  id: string;
  activityType: ActivityType;
  activityDate: string;
  notes: string | null;
}

/** ダッシュボードの「直近の活動履歴」（設計書 11.4）で使う、クライアント名付きの要約 */
export interface ActivityWithClient {
  id: string;
  clientId: string;
  clientName: string;
  activityType: ActivityType;
  activityDate: string;
  /** 活動内容の要約表示用（商談メモの先頭部分など） */
  notes: string | null;
  owner: ActivityOwnerRef;
}

export interface RawActivityWithClientRow {
  id: string;
  client_id: string;
  activity_type: ActivityType;
  activity_date: string;
  notes: string | null;
  owner: { id: string; full_name: string } | null;
  client: { company_name: string } | null;
}

export interface RawActivityRow {
  id: string;
  client_id: string;
  activity_type: ActivityType;
  activity_date: string;
  participants: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  owner: { id: string; full_name: string } | null;
}

export interface RawLatestActivityRow {
  id: string;
  activity_type: ActivityType;
  activity_date: string;
  notes: string | null;
}

export function mapActivityRow(row: RawActivityRow): Activity {
  return {
    id: row.id,
    clientId: row.client_id,
    activityType: row.activity_type,
    activityDate: row.activity_date,
    owner: row.owner ? { id: row.owner.id, fullName: row.owner.full_name } : { id: '', fullName: '不明' },
    participants: row.participants,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapLatestActivityRow(row: RawLatestActivityRow): LatestActivitySummary {
  return {
    id: row.id,
    activityType: row.activity_type,
    activityDate: row.activity_date,
    notes: row.notes,
  };
}

export function mapActivityWithClientRow(row: RawActivityWithClientRow): ActivityWithClient {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client?.company_name ?? '不明',
    activityType: row.activity_type,
    activityDate: row.activity_date,
    notes: row.notes,
    owner: row.owner ? { id: row.owner.id, fullName: row.owner.full_name } : { id: '', fullName: '不明' },
  };
}
