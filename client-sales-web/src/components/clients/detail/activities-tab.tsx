import { NotebookPen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AddActivityDialog } from './add-activity-dialog';
import { ActivityRowActions } from '@/components/activities/activity-row-actions';
import { ACTIVITY_TYPE_ICONS, ACTIVITY_TYPE_LABELS, formatDateSlash } from '@/lib/domain-labels';
import type { Activity, ClientNote } from '@/lib/api/types';

type TimelineEntry =
  | { kind: 'activity'; date: string; sortKey: string; activity: Activity }
  | { kind: 'note'; date: string; sortKey: string; note: ClientNote };

/** activities(活動履歴本体)とclient_notes(商談メモ)を、日付降順の1本のタイムラインにまとめる。 */
function buildTimeline(activities: Activity[], notes: ClientNote[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...activities.map((activity) => ({
      kind: 'activity' as const,
      date: activity.activityDate,
      sortKey: activity.createdAt,
      activity,
    })),
    ...notes.map((note) => ({
      kind: 'note' as const,
      date: note.createdAt.slice(0, 10),
      sortKey: note.createdAt,
      note,
    })),
  ];

  return entries.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.sortKey.localeCompare(a.sortKey);
  });
}

export function ActivitiesTab({
  clientId,
  activities,
  notes,
}: {
  clientId: string;
  activities: Activity[];
  notes: ClientNote[];
}) {
  const timeline = buildTimeline(activities, notes);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddActivityDialog clientId={clientId} />
      </div>

      {timeline.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            まだ活動記録がありません。最初の活動を記録しましょう。
          </CardContent>
        </Card>
      ) : (
        <ol className="space-y-0">
          {timeline.map((entry, index) => {
            const isLast = index === timeline.length - 1;

            if (entry.kind === 'activity') {
              const { activity } = entry;
              const Icon = ACTIVITY_TYPE_ICONS[activity.activityType];
              return (
                <li key={`activity-${activity.id}`} className="relative flex gap-4 pb-6 last:pb-0">
                  {!isLast ? (
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{activity.owner.fullName}</span>
                          <ActivityRowActions clientId={clientId} activity={activity} />
                        </div>
                      </div>
                      {activity.participants ? (
                        <p className="text-xs text-muted-foreground">先方: {activity.participants}</p>
                      ) : null}
                      {activity.notes ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                          {activity.notes}
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                </li>
              );
            }

            const { note } = entry;
            const Icon = note.meetingType ? ACTIVITY_TYPE_ICONS[note.meetingType] : NotebookPen;
            const label = note.meetingType ? ACTIVITY_TYPE_LABELS[note.meetingType] : '商談メモ';
            return (
              <li key={`note-${note.id}`} className="relative flex gap-4 pb-6 last:pb-0">
                {!isLast ? (
                  <span className="absolute top-9 left-4.5 h-[calc(100%-2rem)] w-px bg-border" aria-hidden />
                ) : null}
                <span className="z-10 flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                  <Icon className="size-4.5" />
                </span>
                <Card className="flex-1">
                  <CardContent className="space-y-1.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {formatDateSlash(entry.date)} ・ {label}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        商談メモ
                      </span>
                    </div>
                    {note.participantsOwn || note.participantsClient ? (
                      <p className="text-xs text-muted-foreground">
                        参加者(当社): {note.participantsOwn || '未入力'} ・ 参加者(先方):{' '}
                        {note.participantsClient || '未入力'}
                      </p>
                    ) : null}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{note.content}</p>
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
