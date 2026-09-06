import { Injectable } from '@nestjs/common';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import { throwIfSupabaseError } from '../common/supabase/supabase-error.util.js';
import { mapOfficeRow, type Office, type RawOfficeRow } from './offices.types.js';

/**
 * 拠点マスタ（設計書 #23 拠点管理）。閲覧は全員可（RLS: offices_select_all）。
 * 現時点では一覧取得のみ。作成・編集はSTEP16以降、必要になった時点で追加する。
 */
@Injectable()
export class OfficesService {
  constructor(private readonly supabaseRequestService: SupabaseRequestService) {}

  async list(): Promise<Office[]> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client.from('offices').select('id, name, prefecture, address').order('name');

    throwIfSupabaseError(error, { entityName: 'Office' });
    return ((data ?? []) as unknown as RawOfficeRow[]).map(mapOfficeRow);
  }
}
