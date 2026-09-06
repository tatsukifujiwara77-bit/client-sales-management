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
