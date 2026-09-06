import { ArrowUp, ArrowDown, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { KpiMetric } from '@/lib/api/types';

interface KpiCardProps {
  icon: LucideIcon;
  iconClassName: string;
  /** カード左上に淡くにじませるアクセントカラー（グラデーションの起点色）。省略時はアイコンの装飾のみ。 */
  glowClassName?: string;
  label: string;
  unit: string;
  metric: KpiMetric;
}

export function KpiCard({ icon: Icon, iconClassName, glowClassName, label, unit, metric }: KpiCardProps) {
  const { count, changePercent } = metric;
  const isUp = (changePercent ?? 0) >= 0;

  return (
    <Card className="relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-md">
      {glowClassName ? (
        <div
          aria-hidden
          className={cn('pointer-events-none absolute -top-8 -right-8 size-28 rounded-full blur-2xl', glowClassName)}
        />
      ) : null}
      <CardContent className="relative flex items-center gap-4 py-1">
        <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', iconClassName)}>
          <Icon className="size-5.5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            {count.toLocaleString()}
            <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>
          </p>
          {changePercent !== null ? (
            <p
              className={cn(
                'flex items-center gap-1 text-xs font-medium whitespace-nowrap',
                isUp ? 'text-success' : 'text-destructive',
              )}
            >
              先月比
              {isUp ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
              {Math.abs(changePercent)}%
            </p>
          ) : (
            <p className="text-xs text-muted-foreground whitespace-nowrap">先月比 —</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
