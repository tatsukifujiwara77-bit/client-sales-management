import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import { AlertsService } from '../alerts/alerts.service.js';
import { throwIfSupabaseError } from '../common/supabase/supabase-error.util.js';
import type { AuthUser } from '../common/types/authenticated-request.js';
import type { PagedResult } from '../common/types/paged-result.js';
import type { CreateActivityDto } from './dto/create-activity.dto.js';
import type { UpdateActivityDto } from './dto/update-activity.dto.js';
import type { ListActivitiesQueryDto } from './dto/list-activities-query.dto.js';
import type { ListActivitiesAcrossClientsQueryDto } from './dto/list-activities-across-clients-query.dto.js';
import {
  mapActivityRow,
  mapActivityWithClientRow,
  mapLatestActivityRow,
  type Activity,
  type ActivityWithClient,
  type LatestActivitySummary,
  type RawActivityRow,
  type RawActivityWithClientRow,
  type RawLatestActivityRow,
} from './activities.types.js';

const COLUMNS =
  'id, client_id, activity_type, activity_date, participants, notes, created_at, updated_at, ' +
  'owner:profiles!activities_owner_id_fkey(id, full_name)';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    private readonly supabaseRequestService: SupabaseRequestService,
    private readonly alertsService: AlertsService,
  ) {}

  async list(clientId: string, query: ListActivitiesQueryDto): Promise<PagedResult<Activity>> {
    const client = this.supabaseRequestService.getClient();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    let builder = client
      .from('activities')
      .select(COLUMNS, { count: 'exact' })
      .eq('client_id', clientId);

    if (query.activityType) {
      builder = builder.eq('activity_type', query.activityType);
    }
    if (query.dateFrom) {
      builder = builder.gte('activity_date', query.dateFrom);
    }
    if (query.dateTo) {
      builder = builder.lte('activity_date', query.dateTo);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    // 最新の活動を上に（設計書 11.4「営業活動タイムライン」）
    const { data, error, count } = await builder
      .order('activity_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to);

    throwIfSupabaseError(error, { entityName: 'Activity' });

    const rows = (data ?? []) as unknown as RawActivityRow[];
    return { items: rows.map(mapActivityRow), total: count ?? 0, page, pageSize };
  }

  async findOne(clientId: string, activityId: string): Promise<Activity> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('activities')
      .select(COLUMNS)
      .eq('id', activityId)
      .eq('client_id', clientId)
      .maybeSingle();

    throwIfSupabaseError(error, { entityName: 'Activity' });
    if (!data) {
      throw new NotFoundException('Activity not found.');
    }
    return mapActivityRow(data as unknown as RawActivityRow);
  }

  /** クライアントカルテ用の軽量な最新活動サマリー */
  async findLatestForClient(clientId: string): Promise<LatestActivitySummary | null> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('activities')
      .select('id, activity_type, activity_date, notes')
      .eq('client_id', clientId)
      .order('activity_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    throwIfSupabaseError(error, { entityName: 'Activity' });
    return data ? mapLatestActivityRow(data as unknown as RawLatestActivityRow) : null;
  }

  /**
   * GET /activities（設計書 11.4「営業活動タイムライン」）。
   * クライアントを横断して、RLSでアクセス可能な範囲の活動をページネーション・
   * 絞り込み付きで返す。ダッシュボードの findRecentAcrossClients（直近N件専用、
   * フィルタ無し）とは用途が異なるため、既存メソッドは変更せず並置する。
   */
  async listAcrossClients(query: ListActivitiesAcrossClientsQueryDto): Promise<PagedResult<ActivityWithClient>> {
    const client = this.supabaseRequestService.getClient();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    // officeIdで絞り込む場合のみ !inner にして client.office_id をフィルタ可能にする
    // （findForMeetingReviewと同じ方針）。
    const clientEmbed = query.officeId ? 'client:clients!inner(company_name, office_id)' : 'client:clients(company_name)';

    let builder = client.from('activities').select(
      `id, client_id, activity_type, activity_date, notes, owner:profiles!activities_owner_id_fkey(id, full_name), ${clientEmbed}`,
      { count: 'exact' },
    );

    if (query.activityType) {
      builder = builder.eq('activity_type', query.activityType);
    }
    if (query.clientId) {
      builder = builder.eq('client_id', query.clientId);
    }
    if (query.ownerId) {
      builder = builder.eq('owner_id', query.ownerId);
    }
    if (query.officeId) {
      builder = builder.eq('client.office_id', query.officeId);
    }
    if (query.dateFrom) {
      builder = builder.gte('activity_date', query.dateFrom);
    }
    if (query.dateTo) {
      builder = builder.lte('activity_date', query.dateTo);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await builder
      .order('activity_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to);

    throwIfSupabaseError(error, { entityName: 'Activity' });

    const rows = (data ?? []) as unknown as RawActivityWithClientRow[];
    return { items: rows.map(mapActivityWithClientRow), total: count ?? 0, page, pageSize };
  }

  /**
   * ダッシュボード「直近の活動履歴」用。クライアントを横断して、
   * RLSでアクセス可能な範囲の最新の活動を返す。
   */
  async findRecentAcrossClients(limit = 10): Promise<ActivityWithClient[]> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('activities')
      .select(
        'id, client_id, activity_type, activity_date, notes, ' +
          'owner:profiles!activities_owner_id_fkey(id, full_name), client:clients(company_name)',
      )
      .order('activity_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    throwIfSupabaseError(error, { entityName: 'Activity' });
    return ((data ?? []) as unknown as RawActivityWithClientRow[]).map(mapActivityWithClientRow);
  }

  /**
   * 営業会議モード（STEP14）用。期間・拠点を指定して、クライアントを横断した
   * 活動一覧を返す（「前回の会議から何が起きたか」のレビュー用）。
   */
  async findForMeetingReview(params: {
    dateFrom: string;
    dateTo: string;
    officeId?: string;
    limit?: number;
  }): Promise<ActivityWithClient[]> {
    const client = this.supabaseRequestService.getClient();
    const clientEmbed = params.officeId
      ? 'client:clients!inner(company_name, office_id)'
      : 'client:clients(company_name, office_id)';

    let builder = client
      .from('activities')
      .select(
        `id, client_id, activity_type, activity_date, notes, owner:profiles!activities_owner_id_fkey(id, full_name), ${clientEmbed}`,
      )
      .gte('activity_date', params.dateFrom)
      .lte('activity_date', params.dateTo);

    if (params.officeId) {
      builder = builder.eq('client.office_id', params.officeId);
    }

    const { data, error } = await builder
      .order('activity_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(params.limit ?? 100);

    throwIfSupabaseError(error, { entityName: 'Activity' });
    return ((data ?? []) as unknown as RawActivityWithClientRow[]).map(mapActivityWithClientRow);
  }

  async create(clientId: string, dto: CreateActivityDto, currentUser: AuthUser): Promise<Activity> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('activities')
      .insert({
        client_id: clientId,
        activity_type: dto.activityType,
        activity_date: dto.activityDate,
        owner_id: dto.ownerId ?? currentUser.id,
        participants: dto.participants,
        notes: dto.notes,
        created_by: currentUser.id,
        updated_by: currentUser.id,
      })
      .select(COLUMNS)
      .single();

    throwIfSupabaseError(error, { entityName: 'Activity' });
    await this.refreshClientActivityCache(clientId);

    return mapActivityRow(data as unknown as RawActivityRow);
  }

  async update(
    clientId: string,
    activityId: string,
    dto: UpdateActivityDto,
    currentUser: AuthUser,
  ): Promise<Activity> {
    const client = this.supabaseRequestService.getClient();

    const updateRow: Record<string, unknown> = { updated_by: currentUser.id };
    if (dto.activityType !== undefined) updateRow.activity_type = dto.activityType;
    if (dto.activityDate !== undefined) updateRow.activity_date = dto.activityDate;
    if (dto.ownerId !== undefined) updateRow.owner_id = dto.ownerId;
    if (dto.participants !== undefined) updateRow.participants = dto.participants;
    if (dto.notes !== undefined) updateRow.notes = dto.notes;

    const { data, error } = await client
      .from('activities')
      .update(updateRow)
      .eq('id', activityId)
      .eq('client_id', clientId)
      .select(COLUMNS)
      .maybeSingle();

    throwIfSupabaseError(error, { entityName: 'Activity' });
    if (!data) {
      throw new NotFoundException('Activity not found.');
    }

    // activity_date/activity_type が変わりうるため、キャッシュを再計算する
    await this.refreshClientActivityCache(clientId);

    return mapActivityRow(data as unknown as RawActivityRow);
  }

  async remove(clientId: string, activityId: string): Promise<void> {
    const client = this.supabaseRequestService.getClient();
    const { error } = await client
      .from('activities')
      .delete()
      .eq('id', activityId)
      .eq('client_id', clientId);

    throwIfSupabaseError(error, { entityName: 'Activity' });
    await this.refreshClientActivityCache(clientId);
  }

  /**
   * clients.last_visited_at / last_activity_at はactivitiesから集計するキャッシュ列。
   * activityの作成・更新・削除のたびに、そのクライアントの実際の最新値へ再計算する
   * （「直近が新しければ更新」ではなく毎回全件から再計算することで、
   *  古い日付での登録・更新・削除のどのケースでも整合性を保つ）。
   *
   * このキャッシュ更新自体はベストエフォートとする。RLS上、活動そのものは
   * 記録できる担当者でも、clients本体の更新条件（拠点一致等）を満たさない
   * 稀なケースがあり得るため、失敗してもメインの操作（活動の記録）は
   * 成功として扱い、ログにのみ残す。将来的なアラート再計算バッチ(STEP11、
   * service_role使用)で最終的な整合性を担保する。
   */
  private async refreshClientActivityCache(clientId: string): Promise<void> {
    const client = this.supabaseRequestService.getClient();
    try {
      const [{ data: lastActivity, error: activityError }, { data: lastVisit, error: visitError }] =
        await Promise.all([
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
        ]);

      if (activityError || visitError) {
        this.logger.warn(
          `Failed to read activities while refreshing cache for client ${clientId}: ` +
            `${activityError?.message ?? visitError?.message}`,
        );
        return;
      }

      const { error: updateError } = await client
        .from('clients')
        .update({
          last_activity_at: (lastActivity as { activity_date: string } | null)?.activity_date ?? null,
          last_visited_at: (lastVisit as { activity_date: string } | null)?.activity_date ?? null,
        })
        .eq('id', clientId);

      if (updateError) {
        this.logger.warn(`Failed to refresh activity cache for client ${clientId}: ${updateError.message}`);
      }
    } catch (err) {
      this.logger.warn(`Unexpected error refreshing activity cache for client ${clientId}`, err as Error);
    }

    // last_visited_at が変わりうるため、3ヶ月訪問なしアラートも合わせて再計算する
    await this.alertsService.recomputeForClient(clientId);
  }
}
