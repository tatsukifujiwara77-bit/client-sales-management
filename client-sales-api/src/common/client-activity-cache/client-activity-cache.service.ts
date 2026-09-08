import { Injectable, Logger } from '@nestjs/common';
import { SupabaseRequestService } from '../../supabase/supabase-request.service.js';
import { AlertsService } from '../../alerts/alerts.service.js';

function maxDateString(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

/**
 * clients.last_visited_at / last_activity_at はactivities・client_notesから集計する
 * キャッシュ列。
 * - last_activity_at: activities(全種別)と client_notes(商談メモ。訪問/オンライン
 *   問わず、商談メモも活動の一環のため) の両方から最新日を集計する。
 * - last_visited_at: activities(activity_type='visit')と client_notes
 *   (meeting_type='visit') の両方から最新日を集計する（商談メモで「訪問」を
 *   記録した場合も、実際に訪問しているため3ヶ月訪問なしアラートの対象外とする）。
 *   client_notesには明示的な「実施日」項目がないため、created_atの日付を
 *   実施日の代わりに用いる。
 *
 * ActivitiesService/ClientNotesServiceの両方から、それぞれの書き込み
 * (作成・更新・削除)のたびに呼び出される。
 *
 * このキャッシュ更新自体はベストエフォートとする。RLS上、活動・メモそのものは
 * 記録できる担当者でも、clients本体の更新条件（拠点一致等）を満たさない
 * 稀なケースがあり得るため、失敗してもメインの操作は成功として扱い、
 * ログにのみ残す。
 */
@Injectable()
export class ClientActivityCacheService {
  private readonly logger = new Logger(ClientActivityCacheService.name);

  constructor(
    private readonly supabaseRequestService: SupabaseRequestService,
    private readonly alertsService: AlertsService,
  ) {}

  async refresh(clientId: string): Promise<void> {
    const client = this.supabaseRequestService.getClient();
    try {
      const [
        { data: lastActivity, error: activityError },
        { data: lastVisitActivity, error: visitActivityError },
        { data: lastNote, error: noteError },
        { data: lastVisitNote, error: visitNoteError },
      ] = await Promise.all([
        client
          .from('activities')
          .select('activity_date')
          .eq('client_id', clientId)
          .order('activity_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        client
          .from('activities')
          .select('activity_date')
          .eq('client_id', clientId)
          .eq('activity_type', 'visit')
          .order('activity_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        client
          .from('client_notes')
          .select('created_at')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        client
          .from('client_notes')
          .select('created_at')
          .eq('client_id', clientId)
          .eq('meeting_type', 'visit')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (activityError || visitActivityError || noteError || visitNoteError) {
        this.logger.warn(
          `Failed to read activities/notes while refreshing cache for client ${clientId}: ` +
            `${activityError?.message ?? visitActivityError?.message ?? noteError?.message ?? visitNoteError?.message}`,
        );
      } else {
        const activityDate = (lastActivity as { activity_date: string } | null)?.activity_date ?? null;
        const visitActivityDate = (lastVisitActivity as { activity_date: string } | null)?.activity_date ?? null;
        const noteDate = (lastNote as { created_at: string } | null)?.created_at?.slice(0, 10) ?? null;
        const visitNoteDate = (lastVisitNote as { created_at: string } | null)?.created_at?.slice(0, 10) ?? null;

        const { error: updateError } = await client
          .from('clients')
          .update({
            last_activity_at: maxDateString(activityDate, noteDate),
            last_visited_at: maxDateString(visitActivityDate, visitNoteDate),
          })
          .eq('id', clientId);

        if (updateError) {
          this.logger.warn(`Failed to refresh activity cache for client ${clientId}: ${updateError.message}`);
        }
      }
    } catch (err) {
      this.logger.warn(`Unexpected error refreshing activity cache for client ${clientId}`, err as Error);
    } finally {
      // 読み取り/更新が失敗した場合でも、3ヶ月訪問なしアラートの再計算自体は
      // (既存のlast_visited_atを元に)必ず実行する。
      // last_visited_at が変わりうるため、3ヶ月訪問なしアラートも合わせて再計算する
      await this.alertsService.recomputeForClient(clientId);
    }
  }
}
