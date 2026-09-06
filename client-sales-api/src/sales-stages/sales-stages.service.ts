import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import { throwIfSupabaseError } from '../common/supabase/supabase-error.util.js';
import type { UpdateSalesStageDto } from './dto/update-sales-stage.dto.js';
import { mapSalesStageRow, type RawSalesStageRow, type SalesStage } from './sales-stages.types.js';

const COLUMNS = 'id, name, sort_order, is_closed, created_at, updated_at';

@Injectable()
export class SalesStagesService {
  constructor(private readonly supabaseRequestService: SupabaseRequestService) {}

  async list(): Promise<SalesStage[]> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client.from('sales_stages').select(COLUMNS).order('sort_order');

    throwIfSupabaseError(error, { entityName: 'Sales stage' });
    return ((data ?? []) as unknown as RawSalesStageRow[]).map(mapSalesStageRow);
  }

  async update(id: string, dto: UpdateSalesStageDto): Promise<SalesStage> {
    const client = this.supabaseRequestService.getClient();

    const updateRow: Record<string, unknown> = {};
    if (dto.name !== undefined) updateRow.name = dto.name;
    if (dto.sortOrder !== undefined) updateRow.sort_order = dto.sortOrder;

    const { data, error } = await client
      .from('sales_stages')
      .update(updateRow)
      .eq('id', id)
      .select(COLUMNS)
      .maybeSingle();

    throwIfSupabaseError(error, { entityName: 'Sales stage' });
    if (!data) {
      throw new NotFoundException('Sales stage not found.');
    }
    return mapSalesStageRow(data as unknown as RawSalesStageRow);
  }
}
