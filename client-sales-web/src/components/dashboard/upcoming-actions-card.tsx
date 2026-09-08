import Link from 'next/link';
import { CalendarCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { dancingScript } from '@/lib/fonts';
import { formatDateWithWeekday } from '@/lib/domain-labels';
import type { ActionItemWithClient } from '@/lib/api/types';

export function UpcomingActionsCard({ items }: { items: ActionItemWithClient[] }) {
  return (
    <Card className="relative overflow-hidden rounded-bl-[3.25rem]">
      {/* カード固有の装飾: 予定が入っている時も含めて常に添える紫系の淡いグロー＋カレンダーを思わせる点線のリング */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full bg-[oklch(0.58_0.19_297)]/10 blur-2xl"
      />
      <svg aria-hidden viewBox="0 0 160 160" className="pointer-events-none absolute -top-8 -right-8 size-40">
        <circle
          cx="80"
          cy="80"
          r="70"
          fill="none"
          stroke="oklch(0.58 0.19 297)"
          strokeWidth="1.5"
          strokeDasharray="1 7"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
      <CardHeader className="relative flex-row items-center justify-between">
        <CardTitle>今週の次回アクション</CardTitle>
        <Link href="/activities" className="text-xs font-medium text-primary hover:underline">
          すべて見る →
        </Link>
      </CardHeader>
      <CardContent className="relative space-y-1">
        {items.length === 0 ? (
          <div className="relative flex flex-col items-center gap-2 overflow-hidden rounded-xl py-8 text-center">
            {/* 下部の抽象グラデーション装飾（空状態を白一色にしないための演出） */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24">
              <div className="absolute bottom-[-2.5rem] left-[8%] size-28 rounded-full bg-[oklch(0.62_0.15_255)]/15 blur-2xl" />
              <div className="absolute bottom-[-3rem] left-1/2 size-32 -translate-x-1/2 rounded-full bg-[oklch(0.58_0.19_297)]/12 blur-2xl" />
              <div className="absolute right-[8%] bottom-[-2.5rem] size-28 rounded-full bg-[oklch(0.68_0.13_200)]/15 blur-2xl" />
            </div>
            <span className="relative flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-info/20 to-info/5 text-info">
              <CalendarCheck className="size-5.5" />
            </span>
            <p className="relative text-sm text-muted-foreground">対応予定のアクションはありません</p>
            <p className={`${dancingScript.className} relative text-lg text-info/70`}>Keep going!</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-2 py-3 transition-colors hover:bg-muted/60"
            >
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                {formatDateWithWeekday(item.dueDate)}
              </span>
              <span className="max-w-32 shrink-0 truncate text-sm font-medium text-foreground">
                {item.clientName}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{item.content}</span>
              <Avatar className="size-7 shrink-0">
                <AvatarFallback className="bg-secondary text-[11px] text-secondary-foreground">
                  {item.assignee.fullName.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
