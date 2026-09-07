import { Inject, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_CLIENT } from '../supabase/supabase.constants.js';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import { throwIfSupabaseError } from '../common/supabase/supabase-error.util.js';
import type { PagedResult } from '../common/types/paged-result.js';
import type { ListAlertsQueryDto } from './dto/list-alerts-query.dto.js';
import { classifyDueDate, daysBetween, todayDateString } from './date.util.js';
import { mapAlertRow, type Alert, type AlertCounts, type AlertType, type RawAlertRow } from './alerts.types.js';

const COLUMNS =
  'id, client_id, action_item_id, alert_type, target_date, status, created_at, updated_at, ' +
  'client:clients(company_name, assignments:client_assignments(is_primary, profile:profiles(id, full_name)))';

const DEFAULT_NO_VISIT_THRESHOLD_DAYS = 90;

interface PendingActionItemRow {
  id: string;
  due_date: string;
}

interface OpenAlertRow {
  id: string;
  action_item_id: string | null;
  alert_type: AlertType;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly supabaseRequestService: SupabaseRequestService,
    @Inject(SUPABASE_SERVICE_ROLE_CLIENT) private readonly serviceRoleClient: SupabaseClient | null,
  ) {}

  // ------------------------------------------------------------
  // 閲覧・ステータス更新（RLS適用済みクライアント経由。通常のリクエストと同じ経路）
  // ------------------------------------------------------------

  async list(query: ListAlertsQueryDto, clientId?: string): Promise<PagedResult<Alert>> {
    const client = this.supabaseRequestService.getClient();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const status = query.status ?? 'open';

    // officeIdで絞り込む場合のみ !inner にして client.office_id をフィルタ可能にする。
    const columns = query.officeId
      ? 'id, client_id, action_item_id, alert_type, target_date, status, created_at, updated_at, ' +
        'client:clients!inner(company_name, office_id, assignments:client_assignments(is_primary, profile:profiles(id, full_name)))'
      : COLUMNS;

    let builder = client.from('alerts').select(columns, { count: 'exact' }).eq('status', status);
    if (clientId) {
      builder = builder.eq('client_id', clientId);
    }
    if (query.alertType) {
      builder = builder.eq('alert_type', query.alertType);
    }
    if (query.officeId) {
      builder = builder.eq('client.office_id', query.officeId);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await builder
      .order('target_date', { ascending: true, nullsFirst: false })
      .range(from, to);

    throwIfSupabaseError(error, { entityName: 'Alert' });

    const rows = (data ?? []) as unknown as RawAlertRow[];
    return { items: rows.map(mapAlertRow), total: count ?? 0, page, pageSize };
  }

  async getCounts(clientId?: string, officeId?: string): Promise<AlertCounts> {
    const client = this.supabaseRequestService.getClient();

    const countFor = async (alertType: AlertType): Promise<number> => {
      const columns = officeId ? 'id, client:clients!inner(office_id)' : 'id';
      let builder = client
        .from('alerts')
        .select(columns, { count: 'exact', head: true })
        .eq('alert_type', alertType)
        .eq('status', 'open');
      if (clientId) {
        builder = builder.eq('client_id', clientId);
      }
      if (officeId) {
        builder = builder.eq('client.office_id', officeId);
      }
      const { count, error } = await builder;
      throwIfSupabaseError(error, { entityName: 'Alert' });
      return count ?? 0;
    };

    const [overdue, dueToday, dueThisWeek, noVisit] = await Promise.all([
      countFor('overdue'),
      countFor('due_today'),
      countFor('due_this_week'),
      countFor('no_visit'),
    ]);

    return { overdue, dueToday, dueThisWeek, noVisit };
  }

  /** ダッシュボード用: 件数サマリー＋一覧を1回で返す */
  async getDashboard(
    query: ListAlertsQueryDto,
    clientId?: string,
  ): Promise<{ counts: AlertCounts; alerts: PagedResult<Alert> }> {
    const [counts, alerts] = await Promise.all([
      this.getCounts(clientId, query.officeId),
      this.list(query, clientId),
    ]);
    return { counts, alerts };
  }

  async updateStatus(alertId: string, status: 'open' | 'dismissed' | 'resolved'): Promise<Alert> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('alerts')
      .update({ status })
      .eq('id', alertId)
      .select(COLUMNS)
      .maybeSingle();

    throwIfSupabaseError(error, { entityName: 'Alert' });
    if (!data) {
      throw new NotFoundException('Alert not found.');
    }
    return mapAlertRow(data as unknown as RawAlertRow);
  }

  // ------------------------------------------------------------
  // 再計算バッチ（service_role使用。RLSを完全にバイパスする）
  // ------------------------------------------------------------

  /**
   * 1クライアント分のアラートを実際の状態(action_items/clients)から再計算する。
   * - 対応予定日ベース(overdue/due_today/due_this_week): 未対応(pending)の次回アクションごとに
   *   現在の区分を求め、既存のopenアラートと差分があれば入れ替える
   * - 3ヶ月訪問なし(no_visit): 営業終了フェーズでなく、閾値日数以上訪問が無ければ1件だけ立てる
   *
   * ベストエフォート: service_role未設定、または個々のクエリが失敗した場合もログのみで
   * 例外を投げない（呼び出し元の本来の操作＝活動記録や次回アクションの更新を止めないため）。
   */
  async recomputeForClient(clientId: string): Promise<void> {
    if (!this.serviceRoleClient) {
      this.logger.warn('Skipping alert recompute: SUPABASE_SERVICE_ROLE_KEY is not configured.');
      return;
    }
    const svc = this.serviceRoleClient;

    try {
      const { data: clientRow, error: clientError } = await svc
        .from('clients')
        .select('id, last_visited_at, sales_stage:sales_stages(is_closed)')
        .eq('id', clientId)
        .maybeSingle();
      if (clientError || !clientRow) {
        this.logger.warn(
          `Failed to load client ${clientId} for alert recompute: ${clientError?.message ?? 'not found'}`,
        );
        return;
      }

      const { data: pendingItems, error: itemsError } = await svc
        .from('action_items')
        .select('id, due_date')
        .eq('client_id', clientId)
        .eq('status', 'pending');
      if (itemsError) {
        this.logger.warn(`Failed to load pending action items for client ${clientId}: ${itemsError.message}`);
        return;
      }

      const { data: openAlerts, error: openAlertsError } = await svc
        .from('alerts')
        .select('id, action_item_id, alert_type')
        .eq('client_id', clientId)
        .eq('status', 'open');
      if (openAlertsError) {
        this.logger.warn(`Failed to load open alerts for client ${clientId}: ${openAlertsError.message}`);
        return;
      }

      const noVisitThresholdDays = await this.getNoVisitThresholdDays(svc);
      const { toInsert, toResolveIds } = this.diffAlerts(
        clientId,
        clientRow as unknown as { last_visited_at: string | null; sales_stage: { is_closed: boolean } | null },
        (pendingItems ?? []) as PendingActionItemRow[],
        (openAlerts ?? []) as OpenAlertRow[],
        noVisitThresholdDays,
      );

      if (toResolveIds.length > 0) {
        const { error } = await svc.from('alerts').update({ status: 'resolved' }).in('id', toResolveIds);
        if (error) {
          this.logger.warn(`Failed to resolve stale alerts for client ${clientId}: ${error.message}`);
        }
      }
      if (toInsert.length > 0) {
        const { error } = await svc.from('alerts').insert(toInsert);
        if (error) {
          this.logger.warn(`Failed to insert new alerts for client ${clientId}: ${error.message}`);
        }
      }
    } catch (err) {
      this.logger.warn(`Unexpected error recomputing alerts for client ${clientId}`, err as Error);
    }
  }

  /**
   * 毎時0分に全クライアント分のアラートを再計算する。
   *
   * 背景: alertsテーブルはaction_items/activitiesの書き込み時にのみ差分更新される
   * キャッシュであり、日付が経過しただけ（例: 「今週期限」に新しく入った）では
   * 誰も書き込みを行わないため再計算が走らず、実際にはもう該当するはずの
   * due_today/due_this_week/overdue が/alertsに永久に反映されないままになる
   * （ダッシュボードや詳細画面はaction_itemsを都度ライブ集計しているため、
   * この不整合はalerts経由の画面でのみ発生する）。このcronはその「時間経過だけが
   * トリガーとなる」ケースを埋め合わせるための定期再計算。
   * SUPABASE_SERVICE_ROLE_KEY未設定の環境（ローカル開発など）では
   * recomputeAll()が例外を投げるため、ここで捕捉してログのみに留める。
   */
  @Cron(CronExpression.EVERY_HOUR)
  async recomputeAllOnSchedule(): Promise<void> {
    try {
      const { clientsProcessed } = await this.recomputeAll();
      this.logger.log(`Scheduled alert recompute finished for ${clientsProcessed} client(s).`);
    } catch (err) {
      this.logger.warn('Skipped scheduled alert recompute', err as Error);
    }
  }

  /** 全クライアント分を再計算する（管理者が手動で叩くバッチに加え、毎時のcronからも呼ばれる）。 */
  async recomputeAll(): Promise<{ clientsProcessed: number }> {
    if (!this.serviceRoleClient) {
      throw new InternalServerErrorException(
        'SUPABASE_SERVICE_ROLE_KEY is not configured; alert recompute is unavailable.',
      );
    }
    const svc = this.serviceRoleClient;

    let clientsProcessed = 0;
    const pageSize = 500;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await svc
        .from('clients')
        .select('id')
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) {
        throw new InternalServerErrorException(`Failed to list clients for alert recompute: ${error.message}`);
      }
      const rows = (data ?? []) as { id: string }[];
      for (const row of rows) {
        await this.recomputeForClient(row.id);
        clientsProcessed += 1;
      }
      if (rows.length < pageSize) break;
    }

    return { clientsProcessed };
  }

  private async getNoVisitThresholdDays(svc: SupabaseClient): Promise<number> {
    const { data, error } = await svc
      .from('alert_settings')
      .select('value')
      .eq('key', 'no_visit_threshold_days')
      .maybeSingle();
    if (error || !data) {
      return DEFAULT_NO_VISIT_THRESHOLD_DAYS;
    }
    const parsed = Number((data as { value: string }).value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_NO_VISIT_THRESHOLD_DAYS;
  }

  private diffAlerts(
    clientId: string,
    clientRow: { last_visited_at: string | null; sales_stage: { is_closed: boolean } | null },
    pendingItems: PendingActionItemRow[],
    openAlerts: OpenAlertRow[],
    noVisitThresholdDays: number,
  ): {
    toInsert: { client_id: string; action_item_id: string | null; alert_type: AlertType; target_date: string | null }[];
    toResolveIds: string[];
  } {
    const today = todayDateString();
    const toInsert: {
      client_id: string;
      action_item_id: string | null;
      alert_type: AlertType;
      target_date: string | null;
    }[] = [];
    const toResolveIds: string[] = [];

    // --- 対応予定日ベースのアラート ---
    const dueDateById = new Map(pendingItems.map((item) => [item.id, item.due_date]));
    const desiredByActionItem = new Map<string, AlertType>();
    for (const item of pendingItems) {
      const bucket = classifyDueDate(item.due_date, today);
      if (bucket) desiredByActionItem.set(item.id, bucket);
    }

    const openByActionItem = new Map<string, OpenAlertRow>();
    let openNoVisit: OpenAlertRow | undefined;
    for (const alert of openAlerts) {
      if (alert.action_item_id) {
        openByActionItem.set(alert.action_item_id, alert);
      } else if (alert.alert_type === 'no_visit') {
        openNoVisit = alert;
      }
    }

    for (const [actionItemId, desiredType] of desiredByActionItem) {
      const existing = openByActionItem.get(actionItemId);
      if (!existing) {
        toInsert.push({
          client_id: clientId,
          action_item_id: actionItemId,
          alert_type: desiredType,
          target_date: dueDateById.get(actionItemId) ?? null,
        });
      } else if (existing.alert_type !== desiredType) {
        toResolveIds.push(existing.id);
        toInsert.push({
          client_id: clientId,
          action_item_id: actionItemId,
          alert_type: desiredType,
          target_date: dueDateById.get(actionItemId) ?? null,
        });
      }
    }
    for (const [actionItemId, existing] of openByActionItem) {
      if (!desiredByActionItem.has(actionItemId)) {
        toResolveIds.push(existing.id);
      }
    }

    // --- 3ヶ月訪問なしアラート（営業終了クライアントは対象外） ---
    const isClosed = clientRow.sales_stage?.is_closed ?? false;
    const lastVisitedAt = clientRow.last_visited_at;
    const daysSinceVisit = lastVisitedAt ? daysBetween(lastVisitedAt, today) : null;
    const desiredNoVisit = !isClosed && (lastVisitedAt === null || (daysSinceVisit ?? 0) >= noVisitThresholdDays);

    if (desiredNoVisit && !openNoVisit) {
      toInsert.push({ client_id: clientId, action_item_id: null, alert_type: 'no_visit', target_date: lastVisitedAt });
    } else if (!desiredNoVisit && openNoVisit) {
      toResolveIds.push(openNoVisit.id);
    }

    return { toInsert, toResolveIds };
  }
}
