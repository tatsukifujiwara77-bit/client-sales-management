import { Card, CardContent } from '@/components/ui/card';
import { AddActivityDialog } from './add-activity-dialog';
import { ACTIVITY_TYPE_ICONS, ACTIVITY_TYPE_LABELS, formatDateSlash } from '@/lib/domain-labels';
import type { Activity } from '@/lib/api/types';

export function ActivitiesTab({ clientId, activities }: { clientId: string; activities: Activity[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddActivityDialog clientId={clientId} />
      </div>

      {activities.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            まだ活動記録がありません。最初の活動を記録しましょう。
          </CardContent>
        </Card>
      ) : (
        <ol className="space-y-0">
          {activities.map((activity, index) => {
            const Icon = ACTIVITY_TYPE_ICONS[activity.activityType];
            return (
              <li key={activity.id} className="relative flex gap-4 pb-6 last:pb-0">
                {index < activities.length - 1 ? (
                  <span className="absolute top-9 left-4.5 h-[calc(100%-2rem)] w-px bg-border" aria-hidden />
                ) : null}
                <span className="z-10 flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                  <Icon className="size-4.5" />
                </span>
                <Card className="flex-1">
                  <CardContent className="space-y-1.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {formatDateSlash(activity.activityDate)} ・ {ACTIVITY_TYPE_LABELS[activity.activityType]}
                      </span>
                      <span className="text-xs text-muted-foreground">{activity.owner.fullName}</span>
                    </div>
                    {activity.participants ? (
                      <p className="text-xs text-muted-foreground">参加者: {activity.participants}</p>
                    ) : null}
                    {activity.notes ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{activity.notes}</p>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
