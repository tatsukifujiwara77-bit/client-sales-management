import { serverFetchApi } from '@/lib/api/server';
import { AlertsSummaryTiles } from '@/components/alerts/alerts-summary-tiles';
import { AlertsFilterBar } from '@/components/alerts/alerts-filter-bar';
import { AlertsList } from '@/components/alerts/alerts-list';
import { RecomputeAlertsButton } from '@/components/alerts/recompute-alerts-button';
import { PaginationBar } from '@/components/clients/pagination-bar';
import type { AlertsDashboardResponse, MeResponse, Office } from '@/lib/api/types';

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

  const [{ counts, alerts }, offices, me] = await Promise.all([
    serverFetchApi<AlertsDashboardResponse>(`/alerts?${query.toString()}`),
    serverFetchApi<Office[]>('/offices'),
    serverFetchApi<MeResponse>('/me'),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <AlertsSummaryTiles counts={counts} />
        </div>
        {me.role === 'admin' ? (
          <div className="shrink-0">
            <RecomputeAlertsButton />
          </div>
        ) : null}
      </div>

      <AlertsFilterBar offices={offices} />

      <AlertsList alerts={alerts.items} />

      <PaginationBar page={alerts.page} pageSize={alerts.pageSize} total={alerts.total} />
    </div>
  );
}
