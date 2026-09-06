import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import { throwIfSupabaseError } from '../common/supabase/supabase-error.util.js';
import type { MapClientsQueryDto } from './dto/map-clients-query.dto.js';
import { mapMapClientRow, type MapClientPin, type RawMapClientRow } from './map.types.js';

const COLUMNS =
  'id, company_name, lat, lng, address, temperature, ' +
  'sales_stage:sales_stages!inner(id, name, is_closed), ' +
  'office:offices(id, name)';

/** PostgRESTの .or() フィルタ文法を壊しうる区切り文字を除去する（clients.service.tsと同じ方針） */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()%]/g, ' ').trim();
}

@Injectable()
export class MapService {
  constructor(private readonly supabaseRequestService: SupabaseRequestService) {}

  /**
   * 地図表示用のクライアントピン一覧（設計書 11.4「エリア別クライアントマップ」）。
   * lat/lng が設定されているクライアントのみが対象。
   */
  async getMapClients(query: MapClientsQueryDto): Promise<MapClientPin[]> {
    const bboxFields = [query.swLat, query.swLng, query.neLat, query.neLng];
    const hasAnyBbox = bboxFields.some((v) => v !== undefined);
    const hasFullBbox = bboxFields.every((v) => v !== undefined);
    if (hasAnyBbox && !hasFullBbox) {
      throw new BadRequestException(
        'swLat, swLng, neLat and neLng must all be provided together to filter by map bounds.',
      );
    }

    const client = this.supabaseRequestService.getClient();
    let builder = client
      .from('clients')
      .select(COLUMNS)
      .not('lat', 'is', null)
      .not('lng', 'is', null);

    if (hasFullBbox) {
      builder = builder
        .gte('lat', query.swLat!)
        .lte('lat', query.neLat!)
        .gte('lng', query.swLng!)
        .lte('lng', query.neLng!);
    }
    if (query.officeId) {
      builder = builder.eq('office_id', query.officeId);
    }
    if (query.temperature) {
      builder = builder.eq('temperature', query.temperature);
    }
    if (query.salesStageId) {
      builder = builder.eq('sales_stage_id', query.salesStageId);
    }
    if (query.search) {
      const term = sanitizeSearchTerm(query.search);
      if (term) {
        builder = builder.or(`company_name.ilike.%${term}%,address.ilike.%${term}%`);
      }
    }

    const { data, error } = await builder.limit(query.limit ?? 500);
    throwIfSupabaseError(error, { entityName: 'Client' });

    return ((data ?? []) as unknown as RawMapClientRow[]).map(mapMapClientRow);
  }
}
