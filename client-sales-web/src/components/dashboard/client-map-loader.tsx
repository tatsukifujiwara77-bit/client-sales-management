'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { MapClientPin } from '@/lib/api/types';

// Leaflet はモジュール読み込み時に window/document に触れるため、
// Server Component からは `ssr:false` を直接使えない（Next.js 16の制約）。
// そのためこの薄いClient Componentラッパー経由でdynamic importする。
const ClientMap = dynamic(() => import('./client-map').then((m) => m.ClientMap), {
  ssr: false,
  loading: () => <Skeleton className="h-[22.5rem] rounded-xl" />,
});

export function ClientMapLoader({ initialPins }: { initialPins: MapClientPin[] }) {
  return <ClientMap initialPins={initialPins} />;
}
