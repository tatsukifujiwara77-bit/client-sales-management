import type { SupabaseClient } from '@supabase/supabase-js';
import { throwIfSupabaseError } from '../common/supabase/supabase-error.util.js';

/** 業種フィルタで「未設定」を表す予約値（実際のindustries.idとは衝突しない） */
export const UNASSIGNED_INDUSTRY = 'unassigned';

/** どのクライアントIDにも一致しないダミーUUID。業種フィルタの結果が0件のときに .in() へ渡す */
export const NO_MATCH_CLIENT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * 業種フィルタ(複数選択・OR条件、「未設定」も選択可)に合致するclient_idの一覧を返す。
 * PostgRESTだけでは「いずれかの業種を持つ」×「業種を一切持たない」のORを1クエリで
 * 表現できないため、ここでclient_industriesを見て許可client_idのリストに変換し、
 * 呼び出し元はこの結果に対して .in('id', ids) を本クエリに適用する
 * (ids が空配列なら NO_MATCH_CLIENT_ID を渡して「該当なし」を表す)。
 */
export async function resolveClientIdsForIndustryFilter(
  client: SupabaseClient,
  industryIds: string[],
): Promise<string[]> {
  const realIds = industryIds.filter((id) => id !== UNASSIGNED_INDUSTRY);
  const wantsUnassigned = industryIds.includes(UNASSIGNED_INDUSTRY);

  const idSets: string[][] = [];

  if (realIds.length > 0) {
    const { data, error } = await client.from('client_industries').select('client_id').in('industry_id', realIds);
    throwIfSupabaseError(error, { entityName: 'Client' });
    idSets.push(((data ?? []) as { client_id: string }[]).map((row) => row.client_id));
  }

  if (wantsUnassigned) {
    const [{ data: allClients, error: allError }, { data: withIndustry, error: withError }] = await Promise.all([
      client.from('clients').select('id'),
      client.from('client_industries').select('client_id'),
    ]);
    throwIfSupabaseError(allError, { entityName: 'Client' });
    throwIfSupabaseError(withError, { entityName: 'Client' });

    const withIndustrySet = new Set(((withIndustry ?? []) as { client_id: string }[]).map((row) => row.client_id));
    const unassignedIds = ((allClients ?? []) as { id: string }[])
      .map((row) => row.id)
      .filter((id) => !withIndustrySet.has(id));
    idSets.push(unassignedIds);
  }

  return Array.from(new Set(idSets.flat()));
}
