import { serverFetchApi } from '@/lib/api/server';
import { AlertsSummaryTiles } from '@/components/alerts/alerts-summary-tiles';
import { AlertsFilterBar } from '@/components/alerts/alerts-filter-bar';
import { AlertsList } from '@/components/alerts/alerts-list';
import { PaginationBar } from '@/components/clients/pagination-bar';
import type { AlertsDashboardResponse } from '@/lib/api/types';

const PAGE_SIZE = 20;

function toSingle(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AlertsPage({ searchParams }: PageProps<'/alerts'>) {
  const params = await searchParams;

  const query = new URLSearchParams();
  const alertType = toSingle(params.alertType);
  const status = toSingle(params.status) ?? 'open';
  const page = Number(toSingle(params.page) ?? '1') || 1;

  if (alertType) query.set('alertType', alertType);
  query.set('status', status);
  query.set('page', String(page));
  query.set('pageSize', String(PAGE_SIZE));

  const { counts, alerts } = await serverFetchApi<AlertsDashboardResponse>(`/alerts?${query.toString()}`);

  return (
    <div className="space-y-4">
      <AlertsSummaryTiles counts={counts} />

      <AlertsFilterBar />

      <AlertsList alerts={alerts.items} />

      <PaginationBar page={alerts.page} pageSize={alerts.pageSize} total={alerts.total} />
    </div>
  );
}
