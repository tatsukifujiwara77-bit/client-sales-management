import { Injectable } from '@nestjs/common';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import { throwIfSupabaseError } from '../common/supabase/supabase-error.util.js';
import type { AuthUser } from '../common/types/authenticated-request.js';
import type { ApproveUserDto } from './dto/approve-user.dto.js';
import {
  mapPendingProfileRow,
  mapProfileRow,
  type MeResponse,
  type PendingUser,
  type RawPendingProfileRow,
  type RawProfileRow,
  type UserSummary,
} from './users.types.js';

@Injectable()
export class UsersService {
  constructor(private readonly supabaseRequestService: SupabaseRequestService) {}

  /** ヘッダー/サイドバー表示用に、現在ログイン中のユーザー情報を拠点名付きで返す */
  async getMe(user: AuthUser): Promise<MeResponse> {
    let office: MeResponse['office'] = null;

    if (user.officeId) {
      const client = this.supabaseRequestService.getClient();
      const { data, error } = await client
        .from('offices')
        .select('id, name')
        .eq('id', user.officeId)
        .maybeSingle();
      throwIfSupabaseError(error, { entityName: 'Office' });
      if (data) {
        office = { id: data.id, name: data.name };
      }
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      office,
    };
  }

  /** クライアント一覧の「担当者」フィルタ等で使う、社内ユーザーの簡易一覧（profilesは全員閲覧可） */
  async list(): Promise<UserSummary[]> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('profiles')
      .select('id, full_name, role, office_id, is_active')
      .eq('is_active', true)
      .order('full_name');

    throwIfSupabaseError(error, { entityName: 'User' });
    return ((data ?? []) as unknown as RawProfileRow[]).map(mapProfileRow);
  }

  /**
   * 承認待ち（is_active=false）のユーザー一覧（設定画面「ユーザー承認」タブ用）。
   * 呼び出し元（コントローラ）でadmin限定であることを確認済みの前提。
   */
  async listPending(): Promise<PendingUser[]> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('profiles')
      .select('id, full_name, role, office_id, created_at')
      .eq('is_active', false)
      .order('created_at');

    throwIfSupabaseError(error, { entityName: 'User' });
    return ((data ?? []) as unknown as RawPendingProfileRow[]).map(mapPendingProfileRow);
  }

  /**
   * 承認待ちユーザーを有効化する（is_active=true）。ロール・拠点もこの時点で確定させる。
   * 呼び出し元（コントローラ）でadmin限定であることを確認済みの前提
   * （RLS側もprofiles_all_adminにより、実際にadminでなければ0件更新でエラーになる）。
   */
  async approve(id: string, dto: ApproveUserDto): Promise<UserSummary> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('profiles')
      .update({ role: dto.role, office_id: dto.officeId ?? null, is_active: true })
      .eq('id', id)
      .select('id, full_name, role, office_id, is_active')
      .single();

    throwIfSupabaseError(error, { entityName: 'User' });
    return mapProfileRow(data as unknown as RawProfileRow);
  }
}
