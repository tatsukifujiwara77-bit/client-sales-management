'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClientsFilterBar } from './clients-filter-bar';
import { ClientsTable } from './clients-table';
import { ClientsGroupedView } from './clients-grouped-view';
import { PaginationBar } from './pagination-bar';
import { useLocalStorage } from '@/lib/use-local-storage';
import { clientFetchApi } from '@/lib/api/client';
import type { ClientListItem, Industry, IndustryColumn, Office, PagedResult, SalesStage, UserSummary } from '@/lib/api/types';

interface ClientsListPageProps {
  offices: Office[];
  salesStages: SalesStage[];
  users: UserSummary[];
  industries: Industry[];
  flat: PagedResult<ClientListItem>;
  /** クライアント一覧では常にtrue、営業リストでは常にfalse */
  isClosed: boolean;
  basePath: '/clients' | '/sales-list';
  emptyMessage?: string;
}

/**
 * クライアント一覧・営業リストの「一覧／業種別」表示切替(選んだモードはlocalStorageに保存し、
 * 次回も同じモードで開く)。業種別グループの集計は一覧より重い処理のため、サーバー側では
 * 常時取得せず、実際に「業種別」に切り替えたときだけクライアント側で取得する
 * (一覧のまま使う場合はページ遷移のたびに無駄な集計が走らないようにするため)。
 */
export function ClientsListPage({
  offices,
  salesStages,
  users,
  industries,
  flat,
  isClosed,
  basePath,
  emptyMessage,
}: ClientsListPageProps) {
  const [viewMode, setViewMode] = useLocalStorage<'list' | 'grouped'>('clients-view-mode', 'list');
  const searchParams = useSearchParams();
  const [grouped, setGrouped] = useState<IndustryColumn[]>([]);
  const [isLoadingGrouped, setIsLoadingGrouped] = useState(false);

  useEffect(() => {
    if (viewMode !== 'grouped') return;
    let cancelled = false;
    // これから開始する非同期フェッチのローディング表示を即座に出すための同期setState
    // (ClientPicker等、このコードベースの他の非同期フェッチと同じ意図的なパターン)。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingGrouped(true);

    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    params.delete('pageSize');
    params.set('isClosed', String(isClosed));

    clientFetchApi<IndustryColumn[]>(`/clients/grouped-by-industry?${params.toString()}`)
      .then((result) => {
        if (!cancelled) setGrouped(result);
      })
      .catch(() => {
        if (!cancelled) setGrouped([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingGrouped(false);
      });

    return () => {
      cancelled = true;
    };
  }, [viewMode, searchParams, isClosed]);

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
        isLoadingGrouped && grouped.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">読み込み中…</p>
        ) : (
          <ClientsGroupedView columns={grouped} basePath={basePath} />
        )
      ) : (
        <>
          <ClientsTable items={flat.items} basePath={basePath} emptyMessage={emptyMessage} />
          <PaginationBar page={flat.page} pageSize={flat.pageSize} total={flat.total} />
        </>
      )}
    </div>
  );
}
