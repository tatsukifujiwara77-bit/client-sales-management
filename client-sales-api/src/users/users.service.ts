import { Injectable } from '@nestjs/common';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import { throwIfSupabaseError } from '../common/supabase/supabase-error.util.js';
import type { AuthUser } from '../common/types/authenticated-request.js';
import { mapProfileRow, type MeResponse, type RawProfileRow, type UserSummary } from './users.types.js';

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
}
