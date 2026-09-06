'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { MapClientPin, Office, SalesStage } from '@/lib/api/types';

// Leaflet はモジュール読み込み時に window/document に触れるため、
// Server Component からは `ssr:false` を直接使えない（Next.js 16の制約）。
// ダッシュボードの ClientMapLoader と同じ理由でこの薄いラッパー経由にする。
const FullMap = dynamic(() => import('./full-map').then((m) => m.FullMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-[28rem] rounded-lg" />,
});

interface FullMapLoaderProps {
  initialPins: MapClientPin[];
  offices: Office[];
  salesStages: SalesStage[];
}

export function FullMapLoader(props: FullMapLoaderProps) {
  return <FullMap {...props} />;
}
