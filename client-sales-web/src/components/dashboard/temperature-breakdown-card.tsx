import Link from 'next/link';
import { ChevronRight, Flame, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TEMPERATURE_LABELS, type Temperature } from '@/lib/domain-labels';
import type { TemperatureBreakdown } from '@/lib/api/types';

const ORDER: Temperature[] = ['high', 'medium', 'low'];

/** 温度感ごとのアイコン・配色（画像準拠: 高=赤/炎系, 中=黄色, 低=青） */
const ICONS: Record<Temperature, LucideIcon> = { high: Flame, medium: Flame, low: Flame, unknown: Flame };
/**
 * 各温度感の淡いグラデーション背景（画像準拠: 高=赤〜ピンク, 中=黄〜橙, 低=青〜シアン）。
 * 画像Aと同様、該当社数が1件以上ある行だけを着色し、0件の行は白背景のまま淡色アイコンのみで示す。
 */
const ROW_ACTIVE_CLASSES: Record<Temperature, string> = {
  high: 'bg-gradient-to-r from-[oklch(0.94_0.045_20)] to-[oklch(0.96_0.03_350)] hover:from-[oklch(0.92_0.06_20)] hover:to-[oklch(0.94_0.04_350)]',
  medium:
    'bg-gradient-to-r from-[oklch(0.95_0.07_90)] to-[oklch(0.95_0.06_55)] hover:from-[oklch(0.93_0.08_90)] hover:to-[oklch(0.93_0.07_55)]',
  low: 'bg-gradient-to-r from-[oklch(0.94_0.035_235)] to-[oklch(0.95_0.03_200)] hover:from-[oklch(0.92_0.045_235)] hover:to-[oklch(0.93_0.04_200)]',
  unknown: 'bg-muted hover:bg-muted',
};
const ROW_IDLE_CLASSES = 'bg-white border border-border/70 hover:bg-muted/40';
const ICON_BOX_CLASSES: Record<Temperature, string> = {
  high: 'bg-destructive/15 text-destructive',
  medium: 'bg-warning/25 text-warning-foreground',
  low: 'bg-info/15 text-info',
  unknown: 'bg-muted text-muted-foreground',
};

export function TemperatureBreakdownCard({ breakdown }: { breakdown: TemperatureBreakdown }) {
  return (
    <Card className="relative overflow-hidden [mask-image:radial-gradient(white,white)] rounded-tl-[3.25rem]">
      {/* カード固有の装飾: 温度感の両端(高=赤・低=青)を示す二色のアーク。パイプラインの右上スウープと対になる左上スウープ */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -left-12 size-40 rounded-full bg-[oklch(0.63_0.19_25)]/10 blur-2xl"
      />
      <svg aria-hidden viewBox="0 0 160 160" className="pointer-events-none absolute -top-9 -left-9 size-44">
        <path
          d="M 12 80 A 68 68 0 0 1 80 12"
          fill="none"
          stroke="oklch(0.63 0.19 25)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.35"
        />
        <path
          d="M 80 12 A 68 68 0 0 1 148 80"
          fill="none"
          stroke="oklch(0.55 0.19 258)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.3"
        />
      </svg>
      <CardHeader className="relative">
        <CardTitle>温度感別クライアント</CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-3">
        {ORDER.map((temperature) => {
          const Icon = ICONS[temperature];
          const hasClients = breakdown[temperature] > 0;
          return (
            <Link
              key={temperature}
              href="/sales-list"
              className={cnRow(hasClients ? ROW_ACTIVE_CLASSES[temperature] : ROW_IDLE_CLASSES)}
            >
              <span className={boxClass(ICON_BOX_CLASSES[temperature])}>
                <Icon className="size-4.5" />
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">
                {TEMPERATURE_LABELS[temperature]}
              </span>
              <span className="text-lg font-semibold text-foreground">{breakdown[temperature]}社</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </CardContent>
      <div className="border-t border-border px-6 py-3">
        <Link
          href="/sales-list"
          className="flex items-center justify-end gap-1 text-xs font-medium text-primary hover:underline"
        >
          営業リストへ
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </Card>
  );
}

function cnRow(bg: string): string {
  return `group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-soft ${bg}`;
}

function boxClass(colors: string): string {
  return `flex size-9 shrink-0 items-center justify-center rounded-lg ${colors}`;
}
