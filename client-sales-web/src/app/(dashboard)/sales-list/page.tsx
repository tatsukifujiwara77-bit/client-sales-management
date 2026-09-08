import Link from 'next/link';
import { Plus } from 'lucide-react';
import { serverFetchApi } from '@/lib/api/server';
import { Button } from '@/components/ui/button';
import { ClientsFilterBar } from '@/components/clients/clients-filter-bar';
import { ClientsTable } from '@/components/clients/clients-table';
import { PaginationBar } from '@/components/clients/pagination-bar';
import type { ClientListItem, Office, PagedResult, SalesStage, UserSummary } from '@/lib/api/types';

const PAGE_SIZE = 20;

function toSingle(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * 営業リスト(契約前の見込み客)。/clientsとは逆に、常にisClosed=falseを強制する
 * (契約終了になった時点でクライアント一覧側へ「卒業」する設計のため、
 * ここには契約終了フェーズの案件は表示しない)。
 */
export default async function SalesListPage({ searchParams }: PageProps<'/sales-list'>) {
  const params = await searchParams;

  const query = new URLSearchParams();
  const search = toSingle(params.search);
  const officeId = toSingle(params.officeId);
  const assignedTo = toSingle(params.assignedTo);
  const salesStageId = toSingle(params.salesStageId);
  const temperature = toSingle(params.temperature);
  const page = Number(toSingle(params.page) ?? '1') || 1;

  if (search) query.set('search', search);
  if (officeId) query.set('officeId', officeId);
  if (assignedTo) query.set('assignedTo', assignedTo);
  if (salesStageId) query.set('salesStageId', salesStageId);
  if (temperature) query.set('temperature', temperature);
  query.set('isClosed', 'false');
  query.set('page', String(page));
  query.set('pageSize', String(PAGE_SIZE));

  const [list, offices, salesStages, users] = await Promise.all([
    serverFetchApi<PagedResult<ClientListItem>>(`/clients?${query.toString()}`),
    serverFetchApi<Office[]>('/offices'),
    serverFetchApi<SalesStage[]>('/sales-stages'),
    serverFetchApi<UserSummary[]>('/users'),
  ]);

  // このリストに契約終了フェーズは出ないため、フェーズ選択肢からも除いておく
  // (選んでも常に0件になってしまう組み合わせを避ける)。
  const openSalesStages = salesStages.filter((s) => !s.isClosed);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" nativeButton={false} render={<Link href="/sales-list/new" />}>
          <Plus className="size-4" />
          新規リスト登録
        </Button>
      </div>

      <ClientsFilterBar offices={offices} salesStages={openSalesStages} users={users} />

      <ClientsTable
        items={list.items}
        basePath="/sales-list"
        emptyMessage="条件に一致する見込み客が見つかりませんでした"
      />

      <PaginationBar page={list.page} pageSize={list.pageSize} total={list.total} />
    </div>
  );
}
