import Link from 'next/link';
import { Building2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateSlash } from '@/lib/domain-labels';
import type { Alert } from '@/lib/api/types';

export function NoVisitClientsCard({ clients }: { clients: Alert[] }) {
  return (
    <Card className="relative overflow-hidden rounded-tl-[3.25rem]">
      {/* カード固有の装飾: 注意喚起を示すアンバー系の淡いグロー＋「時間の経過」を表す大きな透かしの時計アイコン */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full bg-[oklch(0.7_0.14_55)]/12 blur-2xl"
      />
      <Clock
        aria-hidden
        strokeWidth={1.5}
        className="pointer-events-none absolute -top-4 -right-4 size-28 text-[oklch(0.7_0.14_55)]/25"
      />
      {/* カードの外形にも個性を: 上辺左に小さく突き出た「経過タブ」（左上スウープの外側に配置） */}
      <div aria-hidden className="pointer-events-none absolute -top-2 left-20 size-4 rounded-full bg-[oklch(0.7_0.14_55)]/60" />
      <CardHeader className="relative flex-row items-center justify-between">
        <CardTitle>3ヶ月訪問なしクライアント</CardTitle>
        <Link href="/alerts" className="text-xs font-medium text-primary hover:underline">
          すべて見る →
        </Link>
      </CardHeader>
      <CardContent className="relative">
        {clients.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">対象のクライアントはありません</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {clients.map((alert) => (
              <Link
                key={alert.id}
                // 3ヶ月訪問なしアラートは設計上「契約終了でないクライアント」にのみ立つため、
                // 常に営業リスト側の詳細ページへ遷移する。
                href={`/sales-list/${alert.clientId}`}
                className="flex items-start gap-3 rounded-xl border border-border/70 p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-transparent hover:bg-muted/60 hover:shadow-soft"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <Building2 className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{alert.clientName}</span>
                  <span className="block text-xs text-muted-foreground">
                    最終訪問日 {alert.targetDate ? formatDateSlash(alert.targetDate) : '訪問記録なし'}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    担当者 {alert.primaryAssignee?.fullName ?? '未割当'}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
