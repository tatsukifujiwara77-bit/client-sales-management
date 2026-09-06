import type { NotifyBefore } from './dto/create-action-item.dto.js';
import type { ActionItemStatus } from './dto/list-action-items-query.dto.js';
import type { Activity } from '../activities/activities.types.js';

export interface ActionItemAssigneeRef {
  id: string;
  fullName: string;
}

export interface ActionItem {
  id: string;
  clientId: string;
  sourceActivityId: string | null;
  content: string;
  dueDate: string;
  notifyBefore: NotifyBefore;
  assignee: ActionItemAssigneeRef;
  status: ActionItemStatus;
  completedAt: string | null;
  completedActivityId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** クライアントカルテ（clients/:id/dossier）で使う軽量な要約 */
export interface NextActionItemSummary {
  id: string;
  content: string;
  dueDate: string;
  status: ActionItemStatus;
}

/** POST /clients/:clientId/action-items/:actionItemId/complete のレスポンス */
export interface CompleteActionItemResult {
  actionItem: ActionItem;
  activity: Activity | null;
  nextActionItem: ActionItem | null;
}

/** ダッシュボード「今週の次回アクション」（設計書 11.4）で使う、クライアント名付きの要約 */
export interface ActionItemWithClient {
  id: string;
  clientId: string;
  clientName: string;
  content: string;
  dueDate: string;
  assignee: ActionItemAssigneeRef;
}

export interface RawActionItemWithClientRow {
  id: string;
  client_id: string;
  content: string;
  due_date: string;
  assignee: { id: string; full_name: string } | null;
  client: { company_name: string } | null;
}

export interface RawActionItemRow {
  id: string;
  client_id: string;
  source_activity_id: string | null;
  content: string;
  due_date: string;
  notify_before: NotifyBefore;
  status: ActionItemStatus;
  completed_at: string | null;
  completed_activity_id: string | null;
  created_at: string;
  updated_at: string;
  assignee: { id: string; full_name: string } | null;
}

export interface RawNextActionItemRow {
  id: string;
  content: string;
  due_date: string;
  status: ActionItemStatus;
}

export function mapActionItemRow(row: RawActionItemRow): ActionItem {
  return {
    id: row.id,
    clientId: row.client_id,
    sourceActivityId: row.source_activity_id,
    content: row.content,
    dueDate: row.due_date,
    notifyBefore: row.notify_before,
    assignee: row.assignee
      ? { id: row.assignee.id, fullName: row.assignee.full_name }
      : { id: '', fullName: '不明' },
    status: row.status,
    completedAt: row.completed_at,
    completedActivityId: row.completed_activity_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapNextActionItemRow(row: RawNextActionItemRow): NextActionItemSummary {
  return {
    id: row.id,
    content: row.content,
    dueDate: row.due_date,
    status: row.status,
  };
}

export function mapActionItemWithClientRow(row: RawActionItemWithClientRow): ActionItemWithClient {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client?.company_name ?? '不明',
    content: row.content,
    dueDate: row.due_date,
    assignee: row.assignee
      ? { id: row.assignee.id, fullName: row.assignee.full_name }
      : { id: '', fullName: '不明' },
  };
}
