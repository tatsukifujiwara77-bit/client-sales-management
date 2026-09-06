import type { AuthUser } from '../common/types/authenticated-request.js';

export interface MeResponse {
  id: string;
  email: string | null;
  fullName: string;
  role: AuthUser['role'];
  office: { id: string; name: string } | null;
}

/** クライアント一覧等の「担当者」フィルタ用の簡易ユーザー一覧項目 */
export interface UserSummary {
  id: string;
  fullName: string;
  role: AuthUser['role'];
  officeId: string | null;
  isActive: boolean;
}

export interface RawProfileRow {
  id: string;
  full_name: string;
  role: AuthUser['role'];
  office_id: string | null;
  is_active: boolean;
}

export function mapProfileRow(row: RawProfileRow): UserSummary {
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    officeId: row.office_id,
    isActive: row.is_active,
  };
}

/** 承認待ち（is_active=false）のユーザー1件（設定画面「ユーザー承認」タブ用） */
export interface PendingUser {
  id: string;
  fullName: string;
  role: AuthUser['role'];
  officeId: string | null;
  createdAt: string;
}

export interface RawPendingProfileRow {
  id: string;
  full_name: string;
  role: AuthUser['role'];
  office_id: string | null;
  created_at: string;
}

export function mapPendingProfileRow(row: RawPendingProfileRow): PendingUser {
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    officeId: row.office_id,
    createdAt: row.created_at,
  };
}
