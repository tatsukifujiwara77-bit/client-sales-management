import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { serverFetchApi } from '@/lib/api/server';
import { SalesProgressBoard } from '@/components/sales-progress/sales-progress-board';
import { SalesProgressFilterBar } from '@/components/sales-progress/sales-progress-filter-bar';
import type { Office, PipelineColumn } from '@/lib/api/types';

function toSingle(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SalesProgressPage({ searchParams }: PageProps<'/sales-progress'>) {
  const params = await searchParams;
  const officeId = toSingle(params.officeId);

  const query = new URLSearchParams();
  if (officeId) query.set('officeId', officeId);

  const [columns, offices] = await Promise.all([
    serverFetchApi<PipelineColumn[]>(`/clients/pipeline?${query.toString()}`),
    serverFetchApi<Office[]>('/offices'),
  ]);

  // 「契約済み」フェーズ（isClosed=true）はこのKanban盤の対象外（設計書 5章）。
  // 別途フィルタ済みのクライアント一覧へ遷移するリンクとしてのみ件数を表示する。
  const openColumns = columns.filter((c) => !c.stage.isClosed);
  const closedColumn = columns.find((c) => c.stage.isClosed);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SalesProgressFilterBar offices={offices} />

        {closedColumn ? (
          <Link
            href={`/clients?salesStageId=${closedColumn.stage.id}&isClosed=true`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            契約済み: {closedColumn.count}件
            <ArrowRight className="size-3.5" />
          </Link>
        ) : null}
      </div>

      <SalesProgressBoard initialColumns={openColumns} />
    </div>
  );
}
