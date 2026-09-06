'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PipelineStageSummary } from '@/lib/api/types';

/** 6フェーズ分の系統色（UI参考画像準拠: Green → Teal → Blue の一連のグラデーションで統一） */
const STAGE_COLORS = [
  'oklch(0.7 0.13 145)', // 未接触（グリーン）
  'oklch(0.68 0.13 165)', // アプローチ中
  'oklch(0.65 0.13 178)', // 担当者接触（ティール）
  'oklch(0.62 0.13 205)', // 商談中
  'oklch(0.59 0.15 228)', // 提案・交渉中
  'oklch(0.56 0.17 255)', // 契約・取引中（ブルー）
];

export function PipelineChart({ pipeline }: { pipeline: PipelineStageSummary[] }) {
  // 「営業終了」は完了済み案件のため、進行中パイプラインの集計からは除外する
  const activeStages = pipeline.filter((stage) => !stage.isClosed);
  const total = activeStages.reduce((sum, stage) => sum + stage.count, 0);

  const chartData = activeStages.map((stage, i) => ({
    name: stage.stageName,
    value: stage.count,
    color: STAGE_COLORS[i % STAGE_COLORS.length],
  }));

  return (
    <Card className="relative overflow-hidden rounded-tr-[3.25rem] bg-gradient-to-br from-white to-[oklch(0.97_0.015_200)]">
      {/* カード固有の装飾: ドーナツと呼応する同心円のリング（色ウォッシュだけでなく形でも個性を出す） */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-[oklch(0.65_0.13_178)]/15 blur-2xl"
      />
      <svg aria-hidden viewBox="0 0 160 160" className="pointer-events-none absolute -top-9 -right-9 size-44">
        <circle cx="80" cy="80" r="78" fill="none" stroke="oklch(0.65 0.13 178)" strokeWidth="1.5" opacity="0.35" />
        <circle cx="80" cy="80" r="60" fill="none" stroke="oklch(0.56 0.17 255)" strokeWidth="1.5" opacity="0.3" />
      </svg>
      <CardHeader className="relative flex-row items-center justify-between">
        <CardTitle>営業進捗パイプライン</CardTitle>
      </CardHeader>
      <CardContent className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <div className="relative size-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius="68%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                stroke="none"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-muted-foreground">合計</span>
            <span className="text-2xl font-semibold text-foreground">{total}社</span>
          </div>
        </div>

        <ul className="w-full flex-1 space-y-2">
          {activeStages.map((stage, i) => {
            const percent = total > 0 ? Math.round((stage.count / total) * 100) : 0;
            return (
              <li key={stage.stageId} className="flex items-center gap-2 text-sm">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: STAGE_COLORS[i % STAGE_COLORS.length] }}
                />
                <span className="flex-1 text-muted-foreground">{stage.stageName}</span>
                <span className="font-medium text-foreground">
                  {stage.count}社 <span className="text-xs text-muted-foreground">({percent}%)</span>
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
      <div className="border-t border-border px-6 py-3">
        <Link
          href="/sales-progress"
          className="flex items-center justify-end gap-1 text-xs font-medium text-primary hover:underline"
        >
          クライアント一覧へ
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </Card>
  );
}
