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
import type { GroupedByIndustryQueryDto } from './dto/grouped-by-industry-query.dto.js';
import { mapClientDetailRow, mapClientListRow } from './clients.mapper.js';
import { geocodeAddress } from './geocoding.util.js';
import { extractPrefecture, PREFECTURES } from './prefecture.util.js';
import { NO_MATCH_CLIENT_ID, resolveClientIdsForIndustryFilter } from './industry-filter.util.js';
import type {
  ClientAssignmentItem,
  ClientDetail,
  ClientDossier,
  ClientListItem,
  IndustryColumn,
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

const INDUSTRIES_COLUMNS = 'industry_id, is_primary, industry:industries(id, name)';

const LIST_COLUMNS =
  'id, company_name, temperature, address, building_name, prefecture, last_visited_at, last_activity_at, updated_at, ' +
  'office:offices(id, name), ' +
  'sales_stage:sales_stages!inner(id, name, is_closed), ' +
  `industries:client_industries(${INDUSTRIES_COLUMNS})`;

const DETAIL_COLUMNS =
  'id, company_name, temperature, address, building_name, prefecture, last_visited_at, last_activity_at, updated_at, ' +
  'lat, lng, website_url, characteristics, caution_notes, created_at, created_by, updated_by, ' +
  'office:offices(id, name), ' +
  'sales_stage:sales_stages!inner(id, name, is_closed), ' +
  'loss_reason:loss_reasons(id, name), ' +
  'discovered_by_profile:profiles!clients_discovered_by_fkey(id, full_name), ' +
  'assignments:client_assignments(user_id, is_primary, profile:profiles(id, full_name)), ' +
  `industries:client_industries(${INDUSTRIES_COLUMNS})`;

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
    if (query.prefecture) {
      builder = builder.eq('prefecture', query.prefecture);
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
    if (query.industryIds && query.industryIds.length > 0) {
      const allowedIds = await resolveClientIdsForIndustryFilter(client, query.industryIds);
      builder = builder.in('id', allowedIds.length > 0 ? allowedIds : [NO_MATCH_CLIENT_ID]);
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

  /** client_industriesから「主業種がindustryIdであるclient_id」の一覧を取得する（業種別グループ表示用） */
  private async getClientIdsWithPrimaryIndustry(
    client: ReturnType<SupabaseRequestService['getClient']>,
    industryId: string,
  ): Promise<string[]> {
    const { data, error } = await client
      .from('client_industries')
      .select('client_id')
      .eq('industry_id', industryId)
      .eq('is_primary', true);
    throwIfSupabaseError(error, { entityName: 'Client' });
    return ((data ?? []) as { client_id: string }[]).map((row) => row.client_id);
  }

  /**
   * 業種別グループ表示（一覧・営業リストの「一覧／業種別」切替用）。
   * 業種マスタのsort_order順＋末尾に「未設定」グループを固定で並べる。
   * 各クライアントは主業種(client_industries.is_primary=true)のグループにのみ計上するため
   * (未設定グループ=業種が1つも無いクライアント)、件数の合計はGET /clientsの総件数と一致する。
   * 既存の絞り込み条件は各グループに同様に適用する。
   */
  async getGroupedByIndustry(query: GroupedByIndustryQueryDto): Promise<IndustryColumn[]> {
    const client = this.supabaseRequestService.getClient();
    const perColumnLimit = query.perColumnLimit ?? 50;

    const { data: industryRows, error: industriesError } = await client
      .from('industries')
      .select('id, name')
      .order('sort_order');
    throwIfSupabaseError(industriesError, { entityName: 'Industry' });
    const industries = (industryRows ?? []) as { id: string; name: string }[];

    const searchTerm = query.search ? sanitizeSearchTerm(query.search) : undefined;

    // 業種フィルタ(絞り込みバー側)が指定されている場合、各グループの対象クライアントを
    // さらにその集合との積集合に絞る(「業種別」表示中でも絞り込み条件は効かせる)。
    const filterAllowedIds =
      query.industryIds && query.industryIds.length > 0
        ? new Set(await resolveClientIdsForIndustryFilter(client, query.industryIds))
        : undefined;

    const buildColumn = async (industry: { id: string; name: string } | null): Promise<IndustryColumn> => {
      const primaryIds = industry
        ? await this.getClientIdsWithPrimaryIndustry(client, industry.id)
        : await resolveClientIdsForIndustryFilter(client, ['unassigned']);
      const groupIds = filterAllowedIds ? primaryIds.filter((id) => filterAllowedIds.has(id)) : primaryIds;

      if (groupIds.length === 0) {
        return { industry, count: 0, clients: [] };
      }

      const assignmentsEmbed = query.assignedTo
        ? `assignments:client_assignments!inner(${ASSIGNMENTS_COLUMNS})`
        : `assignments:client_assignments(${ASSIGNMENTS_COLUMNS})`;
      // head:trueのcount専用クエリは、絞り込みに使うembed(is_closed/assignedTo)だけを最小限に含める
      const countSelect = query.assignedTo
        ? 'id, sales_stage:sales_stages!inner(is_closed), assignments:client_assignments!inner(user_id)'
        : 'id, sales_stage:sales_stages!inner(is_closed)';

      let countBuilder = client
        .from('clients')
        .select(countSelect, { count: 'exact', head: true })
        .in('id', groupIds);
      let listBuilder = client
        .from('clients')
        .select(`${LIST_COLUMNS}, ${assignmentsEmbed}`)
        .in('id', groupIds);

      if (query.officeId) {
        countBuilder = countBuilder.eq('office_id', query.officeId);
        listBuilder = listBuilder.eq('office_id', query.officeId);
      }
      if (query.salesStageId) {
        countBuilder = countBuilder.eq('sales_stage_id', query.salesStageId);
        listBuilder = listBuilder.eq('sales_stage_id', query.salesStageId);
      }
      if (query.temperature) {
        countBuilder = countBuilder.eq('temperature', query.temperature);
        listBuilder = listBuilder.eq('temperature', query.temperature);
      }
      if (query.prefecture) {
        countBuilder = countBuilder.eq('prefecture', query.prefecture);
        listBuilder = listBuilder.eq('prefecture', query.prefecture);
      }
      if (query.isClosed !== undefined) {
        countBuilder = countBuilder.eq('sales_stage.is_closed', query.isClosed);
        listBuilder = listBuilder.eq('sales_stage.is_closed', query.isClosed);
      }
      if (query.assignedTo) {
        countBuilder = countBuilder.eq('assignments.user_id', query.assignedTo);
        listBuilder = listBuilder.eq('assignments.user_id', query.assignedTo);
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
        industry,
        count: count ?? 0,
        clients: ((rows ?? []) as unknown as RawClientListRow[]).map(mapClientListRow),
      };
    };

    return Promise.all([...industries.map((industry) => buildColumn(industry)), buildColumn(null)]);
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

  /**
   * lat/lngが明示的に指定されていれば(手動での座標指定を優先して)そのまま使う。
   * 指定が無く住所がある場合のみ、国土地理院の住所検索APIで自動的にジオコーディングする。
   * 該当なし・API失敗時はundefinedのまま返す(保存自体は失敗させず、地図にピンが出ないだけにする)。
   *
   * 都道府県は住所文字列からの判定を最優先し、それで判定できない場合のみ
   * ジオコーディング結果(GSIの完全一致住所)を使って補完する。手動lat/lng指定時で
   * ジオコーディング自体は不要な場合でも、都道府県が住所文字列だけで判定できなければ
   * 都道府県判定のためだけにジオコーディングを1回呼ぶ(座標には反映しない)。
   */
  private async resolveCoordinatesAndPrefecture(
    address: string | undefined,
    lat: number | undefined,
    lng: number | undefined,
  ): Promise<{ lat: number | undefined; lng: number | undefined; prefecture: string | null }> {
    if (!address) {
      return { lat, lng, prefecture: null };
    }

    let prefecture = extractPrefecture(address);
    const needsCoordinates = lat === undefined && lng === undefined;

    if (needsCoordinates || !prefecture) {
      const geocoded = await geocodeAddress(address);
      if (geocoded) {
        if (needsCoordinates) {
          lat = geocoded.lat;
          lng = geocoded.lng;
        }
        prefecture ??= extractPrefecture(address, geocoded.title);
      }
    }

    return { lat, lng, prefecture };
  }

  /**
   * 業種の紐付けを全洗い替えする(担当営業アサインと異なり、フォーム内で完結する単純なタグ
   * 情報のため、create/updateと同じリクエスト内で処理する)。1クライアントにつき主業種は
   * 必ず1件というDB制約(uidx_client_industries_primary)を満たすよう、主業種は
   * primaryIndustryIdが industryIds に含まれていればそれを、無ければ先頭を採用する。
   */
  private async syncIndustries(
    clientId: string,
    industryIds: string[],
    primaryIndustryId: string | undefined,
  ): Promise<void> {
    const client = this.supabaseRequestService.getClient();

    const { error: deleteError } = await client.from('client_industries').delete().eq('client_id', clientId);
    throwIfSupabaseError(deleteError, { entityName: 'Client industry' });

    if (industryIds.length === 0) {
      return;
    }

    const uniqueIds = Array.from(new Set(industryIds));
    const effectivePrimary =
      primaryIndustryId && uniqueIds.includes(primaryIndustryId) ? primaryIndustryId : uniqueIds[0];

    const rows = uniqueIds.map((industryId) => ({
      client_id: clientId,
      industry_id: industryId,
      is_primary: industryId === effectivePrimary,
    }));

    const { error: insertError } = await client.from('client_industries').insert(rows);
    throwIfSupabaseError(insertError, { entityName: 'Client industry' });
  }

  async create(dto: CreateClientDto, currentUser: AuthUser): Promise<ClientDetail> {
    const client = this.supabaseRequestService.getClient();
    const { lat, lng, prefecture } = await this.resolveCoordinatesAndPrefecture(dto.address, dto.lat, dto.lng);

    const insertRow = {
      company_name: dto.companyName,
      office_id: dto.officeId,
      sales_stage_id: dto.salesStageId,
      temperature: dto.temperature,
      address: dto.address,
      building_name: dto.buildingName,
      prefecture,
      lat,
      lng,
      website_url: dto.websiteUrl,
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
      .select('id')
      .single();

    throwIfSupabaseError(error, { entityName: 'Client' });
    const clientId = (data as unknown as { id: string }).id;

    await this.syncIndustries(clientId, dto.industryIds ?? [], dto.primaryIndustryId);
    return this.findOne(clientId);
  }

  async update(id: string, dto: UpdateClientDto, currentUser: AuthUser): Promise<ClientDetail> {
    const client = this.supabaseRequestService.getClient();

    const updateRow: Record<string, unknown> = { updated_by: currentUser.id };
    if (dto.companyName !== undefined) updateRow.company_name = dto.companyName;
    if (dto.officeId !== undefined) updateRow.office_id = dto.officeId;
    if (dto.salesStageId !== undefined) updateRow.sales_stage_id = dto.salesStageId;
    if (dto.temperature !== undefined) updateRow.temperature = dto.temperature;
    if (dto.address !== undefined) updateRow.address = dto.address;
    if (dto.buildingName !== undefined) updateRow.building_name = dto.buildingName;
    if (dto.websiteUrl !== undefined) updateRow.website_url = dto.websiteUrl;
    if (dto.characteristics !== undefined) updateRow.characteristics = dto.characteristics;
    if (dto.cautionNotes !== undefined) updateRow.caution_notes = dto.cautionNotes;
    if (dto.discoveredBy !== undefined) updateRow.discovered_by = dto.discoveredBy;
    if (dto.lossReasonId !== undefined) updateRow.loss_reason_id = dto.lossReasonId;

    // 住所が変更される場合は、緯度経度が明示的に指定されていなければ自動でジオコーディングし、
    // 都道府県も住所から再判定する。住所が変わらない更新では、指定された緯度経度(手動入力)
    // だけをそのまま反映し、都道府県(自動導出専用・手入力欄なし)には触れない。
    if (dto.address !== undefined) {
      const { lat, lng, prefecture } = await this.resolveCoordinatesAndPrefecture(dto.address, dto.lat, dto.lng);
      if (lat !== undefined) updateRow.lat = lat;
      if (lng !== undefined) updateRow.lng = lng;
      updateRow.prefecture = prefecture;
    } else {
      if (dto.lat !== undefined) updateRow.lat = dto.lat;
      if (dto.lng !== undefined) updateRow.lng = dto.lng;
    }

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

    if (dto.industryIds !== undefined) {
      await this.syncIndustries(id, dto.industryIds, dto.primaryIndustryId);
      return this.findOne(id);
    }

    return mapClientDetailRow(data as unknown as RawClientDetailRow);
  }

  /**
   * 所在地はあるが緯度経度が未設定の既存クライアントを、まとめてジオコーディングする
   * (管理者限定。create/updateへの自動ジオコーディング導入前に登録されていたデータの
   * 一括バックフィル用)。1回の呼び出しで最大500件まで処理する。
   * ベストエフォート: 個々のクライアントの失敗は無視して次に進む。
   */
  async backfillGeocoding(): Promise<{ clientsChecked: number; clientsUpdated: number }> {
    const client = this.supabaseRequestService.getClient();

    const { data, error } = await client
      .from('clients')
      .select('id, address')
      .not('address', 'is', null)
      .or('lat.is.null,lng.is.null')
      .limit(500);
    throwIfSupabaseError(error, { entityName: 'Client' });

    const rows = (data ?? []) as { id: string; address: string | null }[];
    let clientsUpdated = 0;

    for (const row of rows) {
      if (!row.address) continue;
      const geocoded = await geocodeAddress(row.address);
      if (!geocoded) continue;

      const { error: updateError } = await client
        .from('clients')
        .update({ lat: geocoded.lat, lng: geocoded.lng })
        .eq('id', row.id);
      if (!updateError) {
        clientsUpdated += 1;
      }
    }

    return { clientsChecked: rows.length, clientsUpdated };
  }

  /**
   * 都道府県が未設定の既存クライアントを、まとめて住所から判定して埋める
   * (管理者限定。都道府県カラム追加前に登録されていたデータの一括バックフィル用)。
   * 1回の呼び出しで最大500件まで処理する。ベストエフォート: 判定できない場合はスキップする。
   */
  async backfillPrefecture(): Promise<{ clientsChecked: number; clientsUpdated: number }> {
    const client = this.supabaseRequestService.getClient();

    const { data, error } = await client
      .from('clients')
      .select('id, address')
      .not('address', 'is', null)
      .is('prefecture', null)
      .limit(500);
    throwIfSupabaseError(error, { entityName: 'Client' });

    const rows = (data ?? []) as { id: string; address: string | null }[];
    let clientsUpdated = 0;

    for (const row of rows) {
      if (!row.address) continue;

      let prefecture = extractPrefecture(row.address);
      if (!prefecture) {
        const geocoded = await geocodeAddress(row.address);
        prefecture = geocoded ? extractPrefecture(row.address, geocoded.title) : null;
      }
      if (!prefecture) continue;

      const { error: updateError } = await client.from('clients').update({ prefecture }).eq('id', row.id);
      if (!updateError) {
        clientsUpdated += 1;
      }
    }

    return { clientsChecked: rows.length, clientsUpdated };
  }

  /**
   * 絞り込みバーの都道府県セレクトの候補一覧（設計書「拠点と連動」要件）。
   * officeIdを指定すると、その拠点に紐づくクライアントの都道府県だけに絞る。
   */
  async getDistinctPrefectures(officeId?: string): Promise<string[]> {
    const client = this.supabaseRequestService.getClient();
    let builder = client.from('clients').select('prefecture').not('prefecture', 'is', null);
    if (officeId) {
      builder = builder.eq('office_id', officeId);
    }

    const { data, error } = await builder;
    throwIfSupabaseError(error, { entityName: 'Client' });

    const present = new Set(((data ?? []) as { prefecture: string }[]).map((row) => row.prefecture));
    return PREFECTURES.filter((pref) => present.has(pref));
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
