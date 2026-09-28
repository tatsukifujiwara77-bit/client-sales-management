'use client';

import { ClientsFilterBar } from './clients-filter-bar';
import { ClientsTable } from './clients-table';
import { ClientsGroupedView } from './clients-grouped-view';
import { PaginationBar } from './pagination-bar';
import { useLocalStorage } from '@/lib/use-local-storage';
import type { ClientListItem, Industry, IndustryColumn, Office, PagedResult, SalesStage, UserSummary } from '@/lib/api/types';

interface ClientsListPageProps {
  offices: Office[];
  salesStages: SalesStage[];
  users: UserSummary[];
  industries: Industry[];
  flat: PagedResult<ClientListItem>;
  grouped: IndustryColumn[];
  basePath: '/clients' | '/sales-list';
  emptyMessage?: string;
}

/**
 * クライアント一覧・営業リストの「一覧／業種別」表示切替(選んだモードはlocalStorageに保存し、
 * 次回も同じモードで開く)。サーバー側では両方のデータを常に取得しておき(flat/grouped)、
 * クライアント側でどちらを描画するかだけを切り替える(localStorageはサーバーで読めないため)。
 */
export function ClientsListPage({
  offices,
  salesStages,
  users,
  industries,
  flat,
  grouped,
  basePath,
  emptyMessage,
}: ClientsListPageProps) {
  const [viewMode, setViewMode] = useLocalStorage<'list' | 'grouped'>('clients-view-mode', 'list');

  return (
    <div className="space-y-4">
      <ClientsFilterBar
        offices={offices}
        salesStages={salesStages}
        users={users}
        industries={industries}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {viewMode === 'grouped' ? (
        <ClientsGroupedView columns={grouped} basePath={basePath} />
      ) : (
        <>
          <ClientsTable items={flat.items} basePath={basePath} emptyMessage={emptyMessage} />
          <PaginationBar page={flat.page} pageSize={flat.pageSize} total={flat.total} />
        </>
      )}
    </div>
  );
}
