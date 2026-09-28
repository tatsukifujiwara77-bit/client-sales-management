import { serverFetchApi } from '@/lib/api/server';
import { ClientsListPage } from '@/components/clients/clients-list-page';
import type {
  ClientListItem,
  Industry,
  IndustryColumn,
  Office,
  PagedResult,
  SalesStage,
  UserSummary,
} from '@/lib/api/types';

const PAGE_SIZE = 20;

function toSingle(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * クライアント一覧。契約終了(isClosed)になった案件のみを表示する
 * (契約前の見込み客は/sales-listで管理し、契約終了で自動的にこちらへ「卒業」する設計のため、
 * ここは常にisClosed=trueを強制する。新規登録もここからは行わず、必ず営業リスト経由)。
 */
export default async function ClientsPage({ searchParams }: PageProps<'/clients'>) {
  const params = await searchParams;

  const search = toSingle(params.search);
  const officeId = toSingle(params.officeId);
  const assignedTo = toSingle(params.assignedTo);
  const salesStageId = toSingle(params.salesStageId);
  const temperature = toSingle(params.temperature);
  const prefecture = toSingle(params.prefecture);
  const industryIds = toSingle(params.industryIds);
  const page = Number(toSingle(params.page) ?? '1') || 1;

  const query = new URLSearchParams();
  if (search) query.set('search', search);
  if (officeId) query.set('officeId', officeId);
  if (assignedTo) query.set('assignedTo', assignedTo);
  if (salesStageId) query.set('salesStageId', salesStageId);
  if (temperature) query.set('temperature', temperature);
  if (prefecture) query.set('prefecture', prefecture);
  if (industryIds) query.set('industryIds', industryIds);
  query.set('isClosed', 'true');
  query.set('page', String(page));
  query.set('pageSize', String(PAGE_SIZE));

  const groupedQuery = new URLSearchParams(query);
  groupedQuery.delete('page');
  groupedQuery.delete('pageSize');

  const [clients, grouped, offices, salesStages, industries, users] = await Promise.all([
    serverFetchApi<PagedResult<ClientListItem>>(`/clients?${query.toString()}`),
    serverFetchApi<IndustryColumn[]>(`/clients/grouped-by-industry?${groupedQuery.toString()}`),
    serverFetchApi<Office[]>('/offices'),
    serverFetchApi<SalesStage[]>('/sales-stages'),
    serverFetchApi<Industry[]>('/industries'),
    serverFetchApi<UserSummary[]>('/users'),
  ]);

  // クライアント一覧は契約終了フェーズのみなので、フェーズ選択肢もそれだけに絞る
  // (未接触・商談中等を選んでも常に0件になってしまう組み合わせを避ける)。
  const closedSalesStages = salesStages.filter((s) => s.isClosed);

  return (
    <ClientsListPage
      offices={offices}
      salesStages={closedSalesStages}
      users={users}
      industries={industries}
      flat={clients}
      grouped={grouped}
      basePath="/clients"
    />
  );
}
