import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import { throwIfSupabaseError } from '../common/supabase/supabase-error.util.js';
import type { AuthUser } from '../common/types/authenticated-request.js';
import { mapAlertSettingRow, type AlertSetting, type RawAlertSettingRow } from './alert-settings.types.js';

const COLUMNS = 'key, value, description, updated_at';

/**
 * アラートのしきい値等の設定（設計書 25.アラート設定）。
 * 閲覧は全員可、変更はRLS上adminのみ許可されている（0002_rls_policies.sql）。
 */
@Injectable()
export class AlertSettingsService {
  constructor(private readonly supabaseRequestService: SupabaseRequestService) {}

  async list(): Promise<AlertSetting[]> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client.from('alert_settings').select(COLUMNS).order('key');

    throwIfSupabaseError(error, { entityName: 'Alert setting' });
    return ((data ?? []) as unknown as RawAlertSettingRow[]).map(mapAlertSettingRow);
  }

  async update(key: string, value: string, currentUser: AuthUser): Promise<AlertSetting> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('alert_settings')
      .update({ value, updated_by: currentUser.id })
      .eq('key', key)
      .select(COLUMNS)
      .maybeSingle();

    throwIfSupabaseError(error, { entityName: 'Alert setting' });
    if (!data) {
      throw new NotFoundException('Alert setting not found.');
    }
    return mapAlertSettingRow(data as unknown as RawAlertSettingRow);
  }
}
