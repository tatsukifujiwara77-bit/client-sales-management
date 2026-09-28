import { serverFetchApi } from '@/lib/api/server';
import { FullMapLoader } from '@/components/map/full-map-loader';
import type { Industry, MapClientPin, Office, SalesStage } from '@/lib/api/types';

function toSingle(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MapPage({ searchParams }: PageProps<'/map'>) {
  const params = await searchParams;

  const query = new URLSearchParams();
  const search = toSingle(params.search);
  const officeId = toSingle(params.officeId);
  const temperature = toSingle(params.temperature);
  const salesStageId = toSingle(params.salesStageId);
  const prefecture = toSingle(params.prefecture);
  const industryIds = toSingle(params.industryIds);

  if (search) query.set('search', search);
  if (officeId) query.set('officeId', officeId);
  if (temperature) query.set('temperature', temperature);
  if (salesStageId) query.set('salesStageId', salesStageId);
  if (prefecture) query.set('prefecture', prefecture);
  if (industryIds) query.set('industryIds', industryIds);

  const [pins, offices, salesStages, industries] = await Promise.all([
    serverFetchApi<MapClientPin[]>(`/map/clients?${query.toString()}`),
    serverFetchApi<Office[]>('/offices'),
    serverFetchApi<SalesStage[]>('/sales-stages'),
    serverFetchApi<Industry[]>('/industries'),
  ]);

  return (
    <div className="h-full">
      <FullMapLoader initialPins={pins} offices={offices} salesStages={salesStages} industries={industries} />
    </div>
  );
}
