import type { Temperature } from '../dto/create-client.dto.js';
import type { ClientContact } from '../../client-contacts/client-contacts.types.js';
import type { ClientNote } from '../../client-notes/client-notes.types.js';
import type { LatestActivitySummary } from '../../activities/activities.types.js';
import type { NextActionItemSummary } from '../../action-items/action-items.types.js';

export interface OfficeRef {
  id: string;
  name: string;
}

export interface SalesStageRef {
  id: string;
  name: string;
  isClosed: boolean;
}

export interface LossReasonRef {
  id: string;
  name: string;
}

export interface UserRef {
  id: string;
  fullName: string;
}

export interface ClientAssignmentItem {
  userId: string;
  fullName: string;
  isPrimary: boolean;
}

/** GET /clients の一覧表示に必要な最小限の項目（設計書 11.4 準拠） */
export interface ClientListItem {
  id: string;
  companyName: string;
  office: OfficeRef | null;
  salesStage: SalesStageRef;
  temperature: Temperature;
  address: string | null;
  lastVisitedAt: string | null;
  lastActivityAt: string | null;
  primaryAssignee: UserRef | null;
  /** 次の未対応アクション（一覧表示用。GET /clients のみ populate、パイプライン等では常にnull） */
  nextAction: NextActionItemSummary | null;
  updatedAt: string;
}

/** GET /clients/:id の詳細。カルテ(client_contacts/client_notes)はSTEP8で別途統合する。 */
export interface ClientDetail extends ClientListItem {
  lat: number | null;
  lng: number | null;
  websiteUrl: string | null;
  characteristics: string | null;
  cautionNotes: string | null;
  discoveredBy: UserRef | null;
  lossReason: LossReasonRef | null;
  assignments: ClientAssignmentItem[];
  createdAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// --- Supabaseから返る生の行の形（select embedding込み） ---

export interface RawOfficeEmbed {
  id: string;
  name: string;
}

export interface RawSalesStageEmbed {
  id: string;
  name: string;
  is_closed: boolean;
}

export interface RawLossReasonEmbed {
  id: string;
  name: string;
}

export interface RawProfileEmbed {
  id: string;
  full_name: string;
}

export interface RawAssignmentEmbed {
  user_id: string;
  is_primary: boolean;
  profile: RawProfileEmbed | null;
}

export interface RawClientListRow {
  id: string;
  company_name: string;
  temperature: Temperature;
  address: string | null;
  last_visited_at: string | null;
  last_activity_at: string | null;
  updated_at: string;
  office: RawOfficeEmbed | null;
  sales_stage: RawSalesStageEmbed;
  assignments: RawAssignmentEmbed[] | null;
}

export interface RawClientDetailRow extends RawClientListRow {
  lat: number | null;
  lng: number | null;
  website_url: string | null;
  characteristics: string | null;
  caution_notes: string | null;
  loss_reason: RawLossReasonEmbed | null;
  discovered_by_profile: RawProfileEmbed | null;
  created_at: string;
  created_by: string | null;
  updated_by: string | null;
}

// --- クライアントカルテ（STEP8） ---
// activities/action_items の型は、それぞれ STEP9/STEP10 で
// 各モジュール(activities/action-items)に一本化した。

/** GET /clients/:id/dossier（クライアントカルテ）のレスポンス */
export interface ClientDossier {
  client: ClientDetail;
  contacts: ClientContact[];
  notes: ClientNote[];
  latestActivity: LatestActivitySummary | null;
  nextActionItem: NextActionItemSummary | null;
}

// --- 営業進捗パイプライン（STEP12） ---

export interface PipelineColumn {
  stage: SalesStageRef;
  /** そのフェーズに該当する総件数（clientsの表示上限とは独立） */
  count: number;
  clients: ClientListItem[];
}
