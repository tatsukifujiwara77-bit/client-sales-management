import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ALERT_TYPE_ICONS, ALERT_TYPE_ICON_CLASSES, ALERT_TYPE_LABELS, type AlertType } from '@/lib/domain-labels';
import type { AlertCounts } from '@/lib/api/types';

const ORDER: AlertType[] = ['overdue', 'due_today', 'due_this_week', 'no_visit'];

const COUNT_KEYS: Record<AlertType, keyof AlertCounts> = {
  overdue: 'overdue',
  due_today: 'dueToday',
  due_this_week: 'dueThisWeek',
  no_visit: 'noVisit',
};

export function AlertsCard({ counts }: { counts: AlertCounts }) {
  return (
    <Card className="relative overflow-hidden rounded-tr-[3.25rem] bg-gradient-to-br from-white to-[oklch(0.97_0.015_255)]">
      {/* カード固有の装飾: アラートらしい赤〜橙の淡いグロー＋警戒を示す同心円のパルスリング */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-[oklch(0.65_0.16_35)]/12 blur-2xl"
      />
      {/* カードの外形にも個性を: 上辺に小さく突き出た「通知タブ」で警戒感を表現（右上スウープの外側に配置） */}
      <div aria-hidden className="pointer-events-none absolute -top-2 right-16 size-4 rounded-full bg-destructive/70" />
      <svg aria-hidden viewBox="0 0 160 160" className="pointer-events-none absolute -top-10 -right-10 size-44">
        <circle cx="80" cy="80" r="72" fill="none" stroke="oklch(0.63 0.19 25)" strokeWidth="1.5" opacity="0.3" />
        <circle
          cx="80"
          cy="80"
          r="50"
          fill="none"
          stroke="oklch(0.63 0.19 25)"
          strokeWidth="1.5"
          strokeDasharray="4 5"
          opacity="0.35"
        />
      </svg>
      <CardHeader className="relative flex-row items-center justify-between">
        <CardTitle>アラート</CardTitle>
        <Link href="/alerts" className="text-xs font-medium text-primary hover:underline">
          すべて見る →
        </Link>
      </CardHeader>
      <CardContent className="relative space-y-2">
        {ORDER.map((alertType) => {
          const Icon = ALERT_TYPE_ICONS[alertType];
          const count = counts[COUNT_KEYS[alertType]];
          return (
            <Link
              key={alertType}
              href="/alerts"
              className="group flex items-center gap-3 rounded-xl border border-border/70 px-4 py-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-transparent hover:bg-muted/60 hover:shadow-soft"
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${ALERT_TYPE_ICON_CLASSES[alertType]}`}
              >
                <Icon className="size-4.5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-xs text-muted-foreground">{ALERT_TYPE_LABELS[alertType]}</span>
                <span className="block text-base font-semibold text-foreground">{count}件</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
