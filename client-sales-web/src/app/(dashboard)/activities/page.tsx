import { serverFetchApi } from '@/lib/api/server';
import { ActivitiesFilterBar } from '@/components/activities/activities-filter-bar';
import { ActivitiesTimeline } from '@/components/activities/activities-timeline';
import { AddActivityGlobalDialog } from '@/components/activities/add-activity-global-dialog';
import { PaginationBar } from '@/components/clients/pagination-bar';
import type { ActivityWithClient, PagedResult } from '@/lib/api/types';

const PAGE_SIZE = 20;

function toSingle(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ActivitiesPage({ searchParams }: PageProps<'/activities'>) {
  const params = await searchParams;

  const query = new URLSearchParams();
  const activityType = toSingle(params.activityType);
  const dateFrom = toSingle(params.dateFrom);
  const dateTo = toSingle(params.dateTo);
  const page = Number(toSingle(params.page) ?? '1') || 1;

  if (activityType) query.set('activityType', activityType);
  if (dateFrom) query.set('dateFrom', dateFrom);
  if (dateTo) query.set('dateTo', dateTo);
  query.set('page', String(page));
  query.set('pageSize', String(PAGE_SIZE));

  const activities = await serverFetchApi<PagedResult<ActivityWithClient>>(`/activities?${query.toString()}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <AddActivityGlobalDialog />
      </div>

      <ActivitiesFilterBar />

      <ActivitiesTimeline activities={activities.items} />

      <PaginationBar page={activities.page} pageSize={activities.pageSize} total={activities.total} />
    </div>
  );
}
