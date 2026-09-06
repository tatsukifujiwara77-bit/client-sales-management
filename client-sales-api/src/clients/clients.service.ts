import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import { throwIfSupabaseError } from '../common/supabase/supabase-error.util.js';
import type { AuthUser } from '../common/types/authenticated-request.js';
import { ClientContactsService } from '../client-contacts/client-contacts.service.js';
import { ClientNotesService } from '../client-notes/client-notes.service.js';
import { ActivitiesService } from '../activities/activities.service.js';
import { ActionItemsService } from '../action-items/action-items.service.js';
import type { PagedResult } from '../common/types/paged-result.js';
import type { CreateClientDto } from './dto/create-client.dto.js';
import type { UpdateClientDto } from './dto/update-client.dto.js';
import type { ListClientsQueryDto, ClientSortField } from './dto/list-clients-query.dto.js';
import type { AssignClientDto } from './dto/assign-client.dto.js';
import type { PipelineQueryDto } from './dto/pipeline-query.dto.js';
import { mapClientDetailRow, mapClientListRow } from './clients.mapper.js';
import type {
  ClientAssignmentItem,
  ClientDetail,
  ClientDossier,
  ClientListItem,
  PipelineColumn,
  RawAssignmentEmbed,
  RawClientDetailRow,
  RawClientListRow,
} from './types/client.types.js';

const SORT_COLUMN_MAP: Record<ClientSortField, string> = {
  companyName: 'company_name',
  lastVisitedAt: 'last_visited_at',
  lastActivityAt: 'last_activity_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const LIST_COLUMNS =
  'id, company_name, temperature, address, last_visited_at, last_activity_at, updated_at, ' +
  'office:offices(id, name), ' +
  'sales_stage:sales_stages!inner(id, name, is_closed)';

const DETAIL_COLUMNS =
  'id, company_name, temperature, address, last_visited_at, last_activity_at, updated_at, ' +
  'lat, lng, characteristics, caution_notes, created_at, created_by, updated_by, ' +
  'office:offices(id, name), ' +
  'sales_stage:sales_stages!inner(id, name, is_closed), ' +
  'loss_reason:loss_reasons(id, name), ' +
  'discovered_by_profile:profiles!clients_discovered_by_fkey(id, full_name), ' +
  'assignments:client_assignments(user_id, is_primary, profile:profiles(id, full_name))';

const ASSIGNMENTS_COLUMNS = 'user_id, is_primary, profile:profiles(id, full_name)';

/** PostgRESTの .or() フィルタ文法を壊しうる区切り文字を除去する */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()%]/g, ' ').trim();
}

@Injectable()
export class ClientsService {
  constructor(
    private readonly supabaseRequestService: SupabaseRequestService,
    private readonly clientContactsService: ClientContactsService,
    private readonly clientNotesService: ClientNotesService,
    private readonly activitiesService: ActivitiesService,
    private readonly actionItemsService: ActionItemsService,
  ) {}

  async list(query: ListClientsQueryDto): Promise<PagedResult<ClientListItem>> {
    const client = this.supabaseRequestService.getClient();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sortBy = query.sortBy ?? 'updatedAt';
    const sortOrder = query.sortOrder ?? 'desc';

    // 担当営業で絞り込む場合のみ、assignments を inner embed にして
    // 「該当担当者が割り当てられているクライアントのみ」に絞る。
    // 通常時は left embed のままにし、未アサインのクライアントも一覧に含める。
    const assignmentsEmbed = query.assignedTo
      ? `assignments:client_assignments!inner(${ASSIGNMENTS_COLUMNS})`
      : `assignments:client_assignments(${ASSIGNMENTS_COLUMNS})`;

    let builder = client
      .from('clients')
      .select(`${LIST_COLUMNS}, ${assignmentsEmbed}`, { count: 'exact' });

    if (query.officeId) {
      builder = builder.eq('office_id', query.officeId);
    }
    if (query.salesStageId) {
      builder = builder.eq('sales_stage_id', query.salesStageId);
    }
    if (query.temperature) {
      builder = builder.eq('temperature', query.temperature);
    }
    if (query.isClosed !== undefined) {
      builder = builder.eq('sales_stage.is_closed', query.isClosed);
    }
    if (query.assignedTo) {
      builder = builder.eq('assignments.user_id', query.assignedTo);
    }
    if (query.search) {
      const term = sanitizeSearchTerm(query.search);
      if (term) {
        builder = builder.or(`company_name.ilike.%${term}%,address.ilike.%${term}%`);
      }
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await builder
      .order(SORT_COLUMN_MAP[sortBy], { ascending: sortOrder === 'asc' })
      .range(from, to);

    throwIfSupabaseError(error, { entityName: 'Client' });

    const rows = (data ?? []) as unknown as RawClientListRow[];
    const items = rows.map(mapClientListRow);
    await this.attachNextActions(client, items);

    return {
      items,
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  /**
   * ページ分のクライアントに対して、それぞれの次の未対応アクションを1回のクエリで
   * まとめて取得し、items に merge する（設計書 11.4「クライアント一覧」表示項目）。
   */
  private async attachNextActions(
    client: ReturnType<SupabaseRequestService['getClient']>,
    items: ClientListItem[],
  ): Promise<void> {
    if (items.length === 0) return;

    const { data, error } = await client
      .from('action_items')
      .select('client_id, id, content, due_date')
      .in(
        'client_id',
        items.map((item) => item.id),
      )
      .eq('status', 'pending')
      .order('due_date', { ascending: true });

    throwIfSupabaseError(error, { entityName: 'Action item' });

    const nextByClient = new Map<string, { id: string; content: string; due_date: string }>();
    for (const row of (data ?? []) as { client_id: string; id: string; content: string; due_date: string }[]) {
      if (!nextByClient.has(row.client_id)) {
        nextByClient.set(row.client_id, row);
      }
    }

    for (const item of items) {
      const next = nextByClient.get(item.id);
      item.nextAction = next
        ? { id: next.id, content: next.content, dueDate: next.due_date, status: 'pending' }
        : null;
    }
  }

  /**
   * 営業進捗パイプライン（設計書 11.4「営業進捗UI」）。
   * sales_stages の並び順どおりに、フェーズごとのクライアント件数とカード一覧を返す。
   * クライアントが0件のフェーズも空カラムとして含める。
   */
  async getPipeline(query: PipelineQueryDto): Promise<PipelineColumn[]> {
    const client = this.supabaseRequestService.getClient();
    const perColumnLimit = query.perColumnLimit ?? 50;

    const { data: stageRows, error: stagesError } = await client
      .from('sales_stages')
      .select('id, name, is_closed')
      .order('sort_order');
    throwIfSupabaseError(stagesError, { entityName: 'Sales stage' });

    const stages = (stageRows ?? []) as { id: string; name: string; is_closed: boolean }[];
    const searchTerm = query.search ? sanitizeSearchTerm(query.search) : undefined;

    const columns = await Promise.all(
      stages.map(async (stage) => {
        let countBuilder = client
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('sales_stage_id', stage.id);
        let listBuilder = client
          .from('clients')
          .select(`${LIST_COLUMNS}, assignments:client_assignments(${ASSIGNMENTS_COLUMNS})`)
          .eq('sales_stage_id', stage.id);

        if (query.officeId) {
          countBuilder = countBuilder.eq('office_id', query.officeId);
          listBuilder = listBuilder.eq('office_id', query.officeId);
        }
        if (query.temperature) {
          countBuilder = countBuilder.eq('temperature', query.temperature);
          listBuilder = listBuilder.eq('temperature', query.temperature);
        }
        if (searchTerm) {
          const orFilter = `company_name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`;
          countBuilder = countBuilder.or(orFilter);
          listBuilder = listBuilder.or(orFilter);
        }

        const [{ count, error: countError }, { data: rows, error: listError }] = await Promise.all([
          countBuilder,
          listBuilder.order('updated_at', { ascending: false }).limit(perColumnLimit),
        ]);
        throwIfSupabaseError(countError, { entityName: 'Client' });
        throwIfSupabaseError(listError, { entityName: 'Client' });

        return {
          stage: { id: stage.id, name: stage.name, isClosed: stage.is_closed },
          count: count ?? 0,
          clients: ((rows ?? []) as unknown as RawClientListRow[]).map(mapClientListRow),
        };
      }),
    );

    return columns;
  }

  async findOne(id: string): Promise<ClientDetail> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('clients')
      .select(DETAIL_COLUMNS)
      .eq('id', id)
      .maybeSingle();

    throwIfSupabaseError(error, { entityName: 'Client' });
    if (!data) {
      throw new NotFoundException('Client not found.');
    }

    return mapClientDetailRow(data as unknown as RawClientDetailRow);
  }

  async create(dto: CreateClientDto, currentUser: AuthUser): Promise<ClientDetail> {
    const client = this.supabaseRequestService.getClient();

    const insertRow = {
      company_name: dto.companyName,
      office_id: dto.officeId,
      sales_stage_id: dto.salesStageId,
      temperature: dto.temperature,
      address: dto.address,
      lat: dto.lat,
      lng: dto.lng,
      characteristics: dto.characteristics,
      caution_notes: dto.cautionNotes,
      discovered_by: dto.discoveredBy ?? currentUser.id,
      loss_reason_id: dto.lossReasonId,
      created_by: currentUser.id,
      updated_by: currentUser.id,
    };

    const { data, error } = await client
      .from('clients')
      .insert(insertRow)
      .select(DETAIL_COLUMNS)
      .single();

    throwIfSupabaseError(error, { entityName: 'Client' });
    return mapClientDetailRow(data as unknown as RawClientDetailRow);
  }

  async update(id: string, dto: UpdateClientDto, currentUser: AuthUser): Promise<ClientDetail> {
    const client = this.supabaseRequestService.getClient();

    const updateRow: Record<string, unknown> = { updated_by: currentUser.id };
    if (dto.companyName !== undefined) updateRow.company_name = dto.companyName;
    if (dto.officeId !== undefined) updateRow.office_id = dto.officeId;
    if (dto.salesStageId !== undefined) updateRow.sales_stage_id = dto.salesStageId;
    if (dto.temperature !== undefined) updateRow.temperature = dto.temperature;
    if (dto.address !== undefined) updateRow.address = dto.address;
    if (dto.lat !== undefined) updateRow.lat = dto.lat;
    if (dto.lng !== undefined) updateRow.lng = dto.lng;
    if (dto.characteristics !== undefined) updateRow.characteristics = dto.characteristics;
    if (dto.cautionNotes !== undefined) updateRow.caution_notes = dto.cautionNotes;
    if (dto.discoveredBy !== undefined) updateRow.discovered_by = dto.discoveredBy;
    if (dto.lossReasonId !== undefined) updateRow.loss_reason_id = dto.lossReasonId;

    const { data, error } = await client
      .from('clients')
      .update(updateRow)
      .eq('id', id)
      .select(DETAIL_COLUMNS)
      .maybeSingle();

    throwIfSupabaseError(error, { entityName: 'Client' });
    if (!data) {
      // RLSにより対象が0件（存在しない、またはアクセス権が無い）。
      // 存在有無を漏らさないため、どちらの場合も一律 404 とする。
      throw new NotFoundException('Client not found.');
    }

    return mapClientDetailRow(data as unknown as RawClientDetailRow);
  }

  /** 関連する活動・次回アクション・アラート・担当割り当て等はON DELETE CASCADEで一括削除される。 */
  async remove(id: string): Promise<void> {
    const client = this.supabaseRequestService.getClient();
    const { error } = await client.from('clients').delete().eq('id', id);
    throwIfSupabaseError(error, { entityName: 'Client' });
  }

  async listAssignments(clientId: string): Promise<ClientAssignmentItem[]> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('client_assignments')
      .select(ASSIGNMENTS_COLUMNS)
      .eq('client_id', clientId);

    throwIfSupabaseError(error, { entityName: 'Client' });
    return this.mapAssignmentRows(data as unknown as RawAssignmentEmbed[] | null);
  }

  async assign(clientId: string, dto: AssignClientDto): Promise<ClientAssignmentItem[]> {
    const client = this.supabaseRequestService.getClient();

    if (dto.isPrimary) {
      // 1クライアントにつき is_primary=true は1件のみ（DBのunique partial index制約）。
      // 先に既存のメイン担当を解除してから新しい担当を primary として登録する。
      // 同時実行下での競合はごく稀なユースケースのため許容している。
      const { error: unsetError } = await client
        .from('client_assignments')
        .update({ is_primary: false })
        .eq('client_id', clientId)
        .eq('is_primary', true);
      throwIfSupabaseError(unsetError, { entityName: 'Client assignment' });
    }

    const { error: insertError } = await client.from('client_assignments').insert({
      client_id: clientId,
      user_id: dto.userId,
      is_primary: dto.isPrimary ?? false,
    });
    throwIfSupabaseError(insertError, { entityName: 'Client assignment' });

    return this.listAssignments(clientId);
  }

  async unassign(clientId: string, userId: string): Promise<void> {
    const client = this.supabaseRequestService.getClient();
    const { error } = await client
      .from('client_assignments')
      .delete()
      .eq('client_id', clientId)
      .eq('user_id', userId);

    throwIfSupabaseError(error, { entityName: 'Client assignment' });
  }

  /**
   * クライアントカルテ（設計書 10章）。
   * 担当者が変わってもクライアントの状況をこの1エンドポイントで把握できるよう、
   * clients本体 + 重要人物(client_contacts) + 常設メモ(client_notes) +
   * 直近の活動 + 次の未対応アクション、を集約して返す。
   *
   * activities/action_items のCRUDそのものはSTEP9/STEP10で実装するため、
   * ここでは要約のための読み取り専用クエリのみを行う。
   */
  async getDossier(id: string): Promise<ClientDossier> {
    const [client, contacts, notes, latestActivity, nextActionItem] = await Promise.all([
      this.findOne(id),
      this.clientContactsService.list(id),
      this.clientNotesService.list(id),
      this.activitiesService.findLatestForClient(id),
      this.actionItemsService.findNextPendingForClient(id),
    ]);

    return { client, contacts, notes, latestActivity, nextActionItem };
  }

  private mapAssignmentRows(rows: RawAssignmentEmbed[] | null): ClientAssignmentItem[] {
    if (!rows) return [];
    return rows
      .filter((row): row is RawAssignmentEmbed & { profile: NonNullable<RawAssignmentEmbed['profile']> } =>
        Boolean(row.profile),
      )
      .map((row) => ({
        userId: row.user_id,
        fullName: row.profile.full_name,
        isPrimary: row.is_primary,
      }));
  }
}
