import { serverFetchApi } from '@/lib/api/server';
import { FullMapLoader } from '@/components/map/full-map-loader';
import type { MapClientPin, Office, SalesStage } from '@/lib/api/types';

export default async function MapPage() {
  const [pins, offices, salesStages] = await Promise.all([
    serverFetchApi<MapClientPin[]>('/map/clients'),
    serverFetchApi<Office[]>('/offices'),
    serverFetchApi<SalesStage[]>('/sales-stages'),
  ]);

  return (
    <div className="h-full">
      <FullMapLoader initialPins={pins} offices={offices} salesStages={salesStages} />
    </div>
  );
}
