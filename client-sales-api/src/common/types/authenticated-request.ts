import type { Request } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * profiles テーブルの行を、req.user として保持するための最小限の型。
 * NestJS側ではこれ以上の権限判定ロジックは持たない
 * （閲覧・編集可否は Supabase 側の RLS が担う）。
 */
export interface AuthUser {
  id: string;
  email: string | null;
  fullName: string;
  role: 'admin' | 'office_manager' | 'sales_rep';
  officeId: string | null;
  isActive: boolean;
}

/**
 * SupabaseAuthGuard を通過したリクエストに付与される情報。
 * - user: ログインユーザーのプロフィール
 * - supabaseClient: そのユーザーのJWTをAuthorizationヘッダーに積んだ
 *   Supabaseクライアント（以後のクエリはこれ経由で行うことでRLSが効く）
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  supabaseClient?: SupabaseClient;
}
