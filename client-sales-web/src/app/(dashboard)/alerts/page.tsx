import { serverFetchApi } from '@/lib/api/server';
import { AlertsSummaryTiles } from '@/components/alerts/alerts-summary-tiles';
import { AlertsFilterBar } from '@/components/alerts/alerts-filter-bar';
import { AlertsList } from '@/components/alerts/alerts-list';
import { PaginationBar } from '@/components/clients/pagination-bar';
import type { AlertsDashboardResponse, Office } from '@/lib/api/types';

const PAGE_SIZE = 20;

function toSingle(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AlertsPage({ searchParams }: PageProps<'/alerts'>) {
  const params = await searchParams;

  const query = new URLSearchParams();
  const alertType = toSingle(params.alertType);
  const officeId = toSingle(params.officeId);
  const status = toSingle(params.status) ?? 'open';
  const page = Number(toSingle(params.page) ?? '1') || 1;

  if (alertType) query.set('alertType', alertType);
  if (officeId) query.set('officeId', officeId);
  query.set('status', status);
  query.set('page', String(page));
  query.set('pageSize', String(PAGE_SIZE));

  const [{ counts, alerts }, offices] = await Promise.all([
    serverFetchApi<AlertsDashboardResponse>(`/alerts?${query.toString()}`),
    serverFetchApi<Office[]>('/offices'),
  ]);

  return (
    <div className="space-y-4">
      <AlertsSummaryTiles counts={counts} />

      <AlertsFilterBar offices={offices} />

      <AlertsList alerts={alerts.items} />

      <PaginationBar page={alerts.page} pageSize={alerts.pageSize} total={alerts.total} />
    </div>
  );
}
