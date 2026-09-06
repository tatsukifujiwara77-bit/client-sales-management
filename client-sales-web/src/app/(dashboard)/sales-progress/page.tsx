import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { serverFetchApi } from '@/lib/api/server';
import { SalesProgressBoard } from '@/components/sales-progress/sales-progress-board';
import type { PipelineColumn } from '@/lib/api/types';

export default async function SalesProgressPage() {
  const columns = await serverFetchApi<PipelineColumn[]>('/clients/pipeline');

  // 「営業終了」フェーズはこのKanban盤の対象外（設計書 5章）。
  // 別途フィルタ済みのクライアント一覧へ遷移するリンクとしてのみ件数を表示する。
  const openColumns = columns.filter((c) => !c.stage.isClosed);
  const closedColumn = columns.find((c) => c.stage.isClosed);

  return (
    <div className="flex h-full flex-col gap-4">
      {closedColumn ? (
        <div className="flex justify-end">
          <Link
            href={`/clients?salesStageId=${closedColumn.stage.id}&isClosed=true`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            営業終了: {closedColumn.count}件
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : null}

      <SalesProgressBoard initialColumns={openColumns} />
    </div>
  );
}
