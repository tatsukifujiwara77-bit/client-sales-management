import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ACTIVITY_TYPE_BADGE_CLASSES,
  ACTIVITY_TYPE_DOT_CLASSES,
  ACTIVITY_TYPE_LABELS,
  formatDateSlash,
} from '@/lib/domain-labels';
import type { ActivityWithClient } from '@/lib/api/types';

export function RecentActivitiesCard({ activities }: { activities: ActivityWithClient[] }) {
  return (
    <Card className="relative overflow-hidden rounded-br-[3.25rem]">
      {/* カード固有の装飾: 活動履歴らしいブルーの淡いグロー（左上）＋タイムラインの流れを示す弧（右下、次回アクションカードの左下スウープと対になる） */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -left-10 size-36 rounded-full bg-[oklch(0.62_0.15_255)]/10 blur-2xl"
      />
      <svg aria-hidden viewBox="0 0 160 160" className="pointer-events-none absolute -right-9 -bottom-9 size-44">
        <path
          d="M 12 148 A 68 68 0 0 0 148 12"
          fill="none"
          stroke="oklch(0.62 0.15 255)"
          strokeWidth="1.5"
          strokeDasharray="2 6"
          strokeLinecap="round"
          opacity="0.3"
        />
      </svg>
      <CardHeader className="relative flex-row items-center justify-between">
        <CardTitle>直近の活動履歴</CardTitle>
        <Link href="/activities" className="text-xs font-medium text-primary hover:underline">
          すべて見る →
        </Link>
      </CardHeader>
      <CardContent className="relative">
        {activities.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">まだ活動記録がありません</p>
        ) : (
          <div>
            {activities.map((activity, i) => {
              const isFirst = i === 0;
              const isLast = i === activities.length - 1;
              return (
              <div
                key={activity.id}
                className="group flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-2 py-3 transition-colors hover:bg-muted/60"
              >
                {/* タイムラインの軌道＋ドット（履歴らしさを形として表現する装飾）。狭い画面では場所を取るため非表示。 */}
                <span
                  aria-hidden
                  className="relative hidden w-3 shrink-0 items-center justify-center self-stretch sm:flex"
                >
                  <span
                    className={`absolute left-1/2 w-px -translate-x-1/2 bg-border ${isFirst ? 'top-1/2' : 'top-0'} ${isLast ? 'bottom-1/2' : 'bottom-0'}`}
                  />
                  <span
                    className={`relative z-10 size-1.5 rounded-full ring-2 ring-card ${ACTIVITY_TYPE_DOT_CLASSES[activity.activityType]}`}
                  />
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDateSlash(activity.activityDate)}
                </span>
                <span
                  className={`inline-flex shrink-0 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap ${ACTIVITY_TYPE_BADGE_CLASSES[activity.activityType]}`}
                >
                  {ACTIVITY_TYPE_LABELS[activity.activityType]}
                </span>
                <span className="max-w-32 shrink-0 truncate text-sm font-medium text-foreground sm:max-w-none">
                  {activity.clientName}
                </span>
                <span className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground sm:block">
                  {activity.notes ?? '—'}
                </span>
                <span className="hidden shrink-0 text-xs text-muted-foreground md:block">
                  {activity.owner.fullName}
                </span>
                <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground/0 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground sm:block" />
              </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
