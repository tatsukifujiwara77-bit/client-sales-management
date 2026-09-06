'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ALERT_TYPE_ICONS, ALERT_TYPE_ICON_CLASSES, ALERT_TYPE_LABELS, type AlertType } from '@/lib/domain-labels';
import type { AlertCounts } from '@/lib/api/types';

const ORDER: AlertType[] = ['overdue', 'due_today', 'due_this_week', 'no_visit'];

const COUNT_KEYS: Record<AlertType, keyof AlertCounts> = {
  overdue: 'overdue',
  due_today: 'dueToday',
  due_this_week: 'dueThisWeek',
  no_visit: 'noVisit',
};

/** 4種類のアラート件数タイル。クリックすると alertType でこの画面自体を絞り込む。 */
export function AlertsSummaryTiles({ counts }: { counts: AlertCounts }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeType = searchParams.get('alertType');

  function toggle(alertType: AlertType) {
    const params = new URLSearchParams(searchParams.toString());
    if (activeType === alertType) {
      params.delete('alertType');
    } else {
      params.set('alertType', alertType);
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {ORDER.map((alertType) => {
        const Icon = ALERT_TYPE_ICONS[alertType];
        const count = counts[COUNT_KEYS[alertType]];
        const isActive = activeType === alertType;
        return (
          <Card
            key={alertType}
            role="button"
            tabIndex={0}
            onClick={() => toggle(alertType)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') toggle(alertType);
            }}
            className={cn(
              'cursor-pointer transition-colors hover:bg-muted/60',
              isActive && 'ring-2 ring-primary',
            )}
          >
            <CardContent className="flex items-center gap-3 py-1">
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-md',
                  ALERT_TYPE_ICON_CLASSES[alertType],
                )}
              >
                <Icon className="size-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs text-muted-foreground">{ALERT_TYPE_LABELS[alertType]}</span>
                <span className="block text-lg font-semibold text-foreground">{count}件</span>
              </span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
