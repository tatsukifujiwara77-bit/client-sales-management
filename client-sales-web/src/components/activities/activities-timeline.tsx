import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { ActivityRowActions } from './activity-row-actions';
import { ACTIVITY_TYPE_ICONS, ACTIVITY_TYPE_LABELS, formatDateSlash } from '@/lib/domain-labels';
import type { ActivityWithClient } from '@/lib/api/types';

/** 営業活動一覧画面（クライアント横断）のタイムライン表示。設計書 11.4「営業活動タイムライン」準拠。 */
export function ActivitiesTimeline({ activities }: { activities: ActivityWithClient[] }) {
  if (activities.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          条件に一致する活動記録が見つかりませんでした
        </CardContent>
      </Card>
    );
  }

  return (
    <ol className="space-y-0">
      {activities.map((activity, index) => {
        const Icon = ACTIVITY_TYPE_ICONS[activity.activityType];
        return (
          <li key={activity.id} className="relative flex gap-4 pb-4 last:pb-0">
            {index < activities.length - 1 ? (
              <span className="absolute top-9 left-4.5 h-[calc(100%-2rem)] w-px bg-border" aria-hidden />
            ) : null}
            <span className="z-10 flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
              <Icon className="size-4.5" />
            </span>
            <Card className="flex-1">
              <CardContent className="space-y-1.5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <Link
                    href={`/clients/${activity.clientId}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {activity.clientName}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{activity.owner.fullName}</span>
                    <ActivityRowActions clientId={activity.clientId} activity={activity} />
                  </div>
                </div>
                <span className="block text-xs font-medium text-muted-foreground">
                  {formatDateSlash(activity.activityDate)} ・ {ACTIVITY_TYPE_LABELS[activity.activityType]}
                </span>
                {activity.notes ? (
                  <p className="line-clamp-2 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                    {activity.notes}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}
