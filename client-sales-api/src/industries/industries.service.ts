import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import { throwIfSupabaseError } from '../common/supabase/supabase-error.util.js';
import type { CreateIndustryDto } from './dto/create-industry.dto.js';
import type { UpdateIndustryDto } from './dto/update-industry.dto.js';
import { mapIndustryRow, type Industry, type RawIndustryRow } from './industries.types.js';

const COLUMNS = 'id, name, sort_order, created_at, updated_at';

@Injectable()
export class IndustriesService {
  constructor(private readonly supabaseRequestService: SupabaseRequestService) {}

  /** 使用件数(業種管理タブで削除可否の判定に使う)は client_industries を集計して付与する */
  private async getUsageCounts(): Promise<Map<string, number>> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client.from('client_industries').select('industry_id');
    throwIfSupabaseError(error, { entityName: 'Industry' });

    const counts = new Map<string, number>();
    for (const row of (data ?? []) as { industry_id: string }[]) {
      counts.set(row.industry_id, (counts.get(row.industry_id) ?? 0) + 1);
    }
    return counts;
  }

  async list(): Promise<Industry[]> {
    const client = this.supabaseRequestService.getClient();
    const [{ data, error }, usageCounts] = await Promise.all([
      client.from('industries').select(COLUMNS).order('sort_order'),
      this.getUsageCounts(),
    ]);

    throwIfSupabaseError(error, { entityName: 'Industry' });
    return ((data ?? []) as unknown as RawIndustryRow[]).map((row) =>
      mapIndustryRow(row, usageCounts.get(row.id) ?? 0),
    );
  }

  async create(dto: CreateIndustryDto): Promise<Industry> {
    const client = this.supabaseRequestService.getClient();

    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const { data: maxRow, error: maxError } = await client
        .from('industries')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      throwIfSupabaseError(maxError, { entityName: 'Industry' });
      sortOrder = ((maxRow as { sort_order: number } | null)?.sort_order ?? 0) + 1;
    }

    const { data, error } = await client
      .from('industries')
      .insert({ name: dto.name, sort_order: sortOrder })
      .select(COLUMNS)
      .single();

    throwIfSupabaseError(error, { entityName: 'Industry' });
    return mapIndustryRow(data as unknown as RawIndustryRow, 0);
  }

  async update(id: string, dto: UpdateIndustryDto): Promise<Industry> {
    const client = this.supabaseRequestService.getClient();

    const updateRow: Record<string, unknown> = {};
    if (dto.name !== undefined) updateRow.name = dto.name;
    if (dto.sortOrder !== undefined) updateRow.sort_order = dto.sortOrder;

    const [{ data, error }, usageCounts] = await Promise.all([
      client.from('industries').update(updateRow).eq('id', id).select(COLUMNS).maybeSingle(),
      this.getUsageCounts(),
    ]);

    throwIfSupabaseError(error, { entityName: 'Industry' });
    if (!data) {
      throw new NotFoundException('Industry not found.');
    }
    const row = data as unknown as RawIndustryRow;
    return mapIndustryRow(row, usageCounts.get(row.id) ?? 0);
  }

  async remove(id: string): Promise<void> {
    const client = this.supabaseRequestService.getClient();
    const { error } = await client.from('industries').delete().eq('id', id);

    if (error?.code === '23503') {
      throw new ConflictException(
        'この業種を使用しているクライアントが存在するため削除できません。先にそれらのクライアントから業種を外してください。',
      );
    }
    throwIfSupabaseError(error, { entityName: 'Industry' });
  }
}
