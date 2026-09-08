import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import { ActivitiesService } from '../activities/activities.service.js';
import { AlertsService } from '../alerts/alerts.service.js';
import { endOfWeekDateString, todayDateString } from '../alerts/date.util.js';
import { throwIfSupabaseError } from '../common/supabase/supabase-error.util.js';
import type { AuthUser } from '../common/types/authenticated-request.js';
import type { PagedResult } from '../common/types/paged-result.js';
import type { CreateActionItemDto } from './dto/create-action-item.dto.js';
import type { UpdateActionItemDto } from './dto/update-action-item.dto.js';
import type { ListActionItemsQueryDto } from './dto/list-action-items-query.dto.js';
import type { CompleteActionItemDto } from './dto/complete-action-item.dto.js';
import {
  mapActionItemRow,
  mapActionItemWithClientRow,
  mapNextActionItemRow,
  type ActionItem,
  type ActionItemWithClient,
  type CompleteActionItemResult,
  type NextActionItemSummary,
  type RawActionItemRow,
  type RawActionItemWithClientRow,
  type RawNextActionItemRow,
} from './action-items.types.js';

const COLUMNS =
  'id, client_id, source_activity_id, content, due_date, notify_before, status, completed_at, ' +
  'completed_activity_id, created_at, updated_at, ' +
  'assignee:profiles!action_items_assigned_to_fkey(id, full_name)';

@Injectable()
export class ActionItemsService {
  constructor(
    private readonly supabaseRequestService: SupabaseRequestService,
    private readonly activitiesService: ActivitiesService,
    private readonly alertsService: AlertsService,
  ) {}

  async list(clientId: string, query: ListActionItemsQueryDto): Promise<PagedResult<ActionItem>> {
    const client = this.supabaseRequestService.getClient();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    let builder = client.from('action_items').select(COLUMNS, { count: 'exact' }).eq('client_id', clientId);

    if (query.status) {
      builder = builder.eq('status', query.status);
    }
    if (query.assignedTo) {
      builder = builder.eq('assigned_to', query.assignedTo);
    }
    if (query.dueBefore) {
      builder = builder.lte('due_date', query.dueBefore);
    }
    if (query.dueAfter) {
      builder = builder.gte('due_date', query.dueAfter);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    // ToDoリストとして「対応予定日が近い順」に並べる
    const { data, error, count } = await builder
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: true })
      .range(from, to);

    throwIfSupabaseError(error, { entityName: 'Action item' });

    const rows = (data ?? []) as unknown as RawActionItemRow[];
    return { items: rows.map(mapActionItemRow), total: count ?? 0, page, pageSize };
  }

  async findOne(clientId: string, actionItemId: string): Promise<ActionItem> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('action_items')
      .select(COLUMNS)
      .eq('id', actionItemId)
      .eq('client_id', clientId)
      .maybeSingle();

    throwIfSupabaseError(error, { entityName: 'Action item' });
    if (!data) {
      throw new NotFoundException('Action item not found.');
    }
    return mapActionItemRow(data as unknown as RawActionItemRow);
  }

  /** クライアントカルテ用の軽量な「次の未対応アクション」サマリー */
  async findNextPendingForClient(clientId: string): Promise<NextActionItemSummary | null> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('action_items')
      .select('id, content, due_date, status')
      .eq('client_id', clientId)
      .eq('status', 'pending')
      .order('due_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    throwIfSupabaseError(error, { entityName: 'Action item' });
    return data ? mapNextActionItemRow(data as unknown as RawNextActionItemRow) : null;
  }

  /**
   * ダッシュボード「今週の次回アクション」用。クライアントを横断して、
   * RLSでアクセス可能な範囲の「今日まで〜今週末まで」の未対応アクションを返す。
   */
  async findUpcomingAcrossClients(limit = 10): Promise<ActionItemWithClient[]> {
    const client = this.supabaseRequestService.getClient();
    const today = todayDateString();
    const endOfWeek = endOfWeekDateString(today);

    const { data, error } = await client
      .from('action_items')
      .select(
        'id, client_id, content, due_date, ' +
          'assignee:profiles!action_items_assigned_to_fkey(id, full_name), client:clients(company_name)',
      )
      .eq('status', 'pending')
      .lte('due_date', endOfWeek)
      .order('due_date', { ascending: true })
      .limit(limit);

    throwIfSupabaseError(error, { entityName: 'Action item' });
    return ((data ?? []) as unknown as RawActionItemWithClientRow[]).map(mapActionItemWithClientRow);
  }

  /**
   * 営業会議モード（STEP14）用。期間・拠点を指定せず、期限超過の未対応アクションを
   * クライアントを横断して返す（会議で優先的に取り上げるべき項目のレビュー用）。
   */
  async findOverdueAcrossClients(params: { officeId?: string; limit?: number } = {}): Promise<ActionItemWithClient[]> {
    const client = this.supabaseRequestService.getClient();
    const today = todayDateString();
    const clientEmbed = params.officeId ? 'client:clients!inner(company_name, office_id)' : 'client:clients(company_name, office_id)';

    let builder = client
      .from('action_items')
      .select(
        `id, client_id, content, due_date, assignee:profiles!action_items_assigned_to_fkey(id, full_name), ${clientEmbed}`,
      )
      .eq('status', 'pending')
      .lt('due_date', today);

    if (params.officeId) {
      builder = builder.eq('client.office_id', params.officeId);
    }

    const { data, error } = await builder.order('due_date', { ascending: true }).limit(params.limit ?? 50);

    throwIfSupabaseError(error, { entityName: 'Action item' });
    return ((data ?? []) as unknown as RawActionItemWithClientRow[]).map(mapActionItemWithClientRow);
  }

  async create(clientId: string, dto: CreateActionItemDto, currentUser: AuthUser): Promise<ActionItem> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('action_items')
      .insert({
        client_id: clientId,
        source_activity_id: dto.sourceActivityId,
        content: dto.content,
        due_date: dto.dueDate,
        notify_before: dto.notifyBefore ?? 'none',
        assigned_to: dto.assignedTo ?? currentUser.id,
        created_by: currentUser.id,
        updated_by: currentUser.id,
      })
      .select(COLUMNS)
      .single();

    throwIfSupabaseError(error, { entityName: 'Action item' });
    await this.alertsService.recomputeForClient(clientId);
    return mapActionItemRow(data as unknown as RawActionItemRow);
  }

  async update(
    clientId: string,
    actionItemId: string,
    dto: UpdateActionItemDto,
    currentUser: AuthUser,
  ): Promise<ActionItem> {
    const client = this.supabaseRequestService.getClient();

    const updateRow: Record<string, unknown> = { updated_by: currentUser.id };
    if (dto.content !== undefined) updateRow.content = dto.content;
    if (dto.dueDate !== undefined) updateRow.due_date = dto.dueDate;
    if (dto.notifyBefore !== undefined) updateRow.notify_before = dto.notifyBefore;
    if (dto.assignedTo !== undefined) updateRow.assigned_to = dto.assignedTo;
    if (dto.status !== undefined) updateRow.status = dto.status;

    const { data, error } = await client
      .from('action_items')
      .update(updateRow)
      .eq('id', actionItemId)
      .eq('client_id', clientId)
      .select(COLUMNS)
      .maybeSingle();

    throwIfSupabaseError(error, { entityName: 'Action item' });
    if (!data) {
      throw new NotFoundException('Action item not found.');
    }
    await this.alertsService.recomputeForClient(clientId);
    return mapActionItemRow(data as unknown as RawActionItemRow);
  }

  async remove(clientId: string, actionItemId: string): Promise<void> {
    const client = this.supabaseRequestService.getClient();
    const { error } = await client
      .from('action_items')
      .delete()
      .eq('id', actionItemId)
      .eq('client_id', clientId);

    throwIfSupabaseError(error, { entityName: 'Action item' });
    await this.alertsService.recomputeForClient(clientId);
  }

  /**
   * 「対応」操作（設計書 8.3 運用サイクル: 訪問→次回アクション→アラート→対応→次回アクション）。
   * - 活動記録(activity)を任意で残す（省略時は活動を作らず完了扱いにする）
   * - 対応と同時に次回アクション(nextAction)を任意でチェーンできる
   */
  async complete(
    clientId: string,
    actionItemId: string,
    dto: CompleteActionItemDto,
    currentUser: AuthUser,
  ): Promise<CompleteActionItemResult> {
    const current = await this.findOne(clientId, actionItemId);
    if (current.status !== 'pending') {
      throw new ConflictException('This action item has already been done or cancelled.');
    }

    const activity = dto.activity
      ? await this.activitiesService.create(
          clientId,
          {
            activityType: dto.activity.activityType,
            activityDate: dto.activity.activityDate ?? todayDateString(),
            participants: dto.activity.participants,
            notes: dto.activity.notes,
          },
          currentUser,
        )
      : null;

    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('action_items')
      .update({
        status: 'done',
        completed_at: new Date().toISOString(),
        completed_activity_id: activity?.id ?? null,
        updated_by: currentUser.id,
      })
      .eq('id', actionItemId)
      .eq('client_id', clientId)
      .select(COLUMNS)
      .maybeSingle();

    throwIfSupabaseError(error, { entityName: 'Action item' });
    if (!data) {
      throw new NotFoundException('Action item not found.');
    }
    // 完了によりこのアクション由来のアラートは解消されるはずなので再計算する
    // （activity/nextAction作成時にも再計算されるが、どちらも省略された場合の保険）
    await this.alertsService.recomputeForClient(clientId);

    const nextActionItem = dto.nextAction
      ? await this.create(
          clientId,
          {
            content: dto.nextAction.content,
            dueDate: dto.nextAction.dueDate,
            notifyBefore: dto.nextAction.notifyBefore,
            assignedTo: dto.nextAction.assignedTo,
            sourceActivityId: activity?.id,
          },
          currentUser,
        )
      : null;

    return {
      actionItem: mapActionItemRow(data as unknown as RawActionItemRow),
      activity,
      nextActionItem,
    };
  }
}
