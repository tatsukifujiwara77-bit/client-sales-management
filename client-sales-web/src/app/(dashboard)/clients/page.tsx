import Link from 'next/link';
import { Plus } from 'lucide-react';
import { serverFetchApi } from '@/lib/api/server';
import { Button } from '@/components/ui/button';
import { ClientsFilterBar } from '@/components/clients/clients-filter-bar';
import { ClientsTable } from '@/components/clients/clients-table';
import { PaginationBar } from '@/components/clients/pagination-bar';
import type { ClientListItem, Office, PagedResult, SalesStage, UserSummary } from '@/lib/api/types';

const PAGE_SIZE = 20;

function toSingle(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ClientsPage({ searchParams }: PageProps<'/clients'>) {
  const params = await searchParams;

  const query = new URLSearchParams();
  const search = toSingle(params.search);
  const officeId = toSingle(params.officeId);
  const assignedTo = toSingle(params.assignedTo);
  const salesStageId = toSingle(params.salesStageId);
  const temperature = toSingle(params.temperature);
  const page = Number(toSingle(params.page) ?? '1') || 1;

  if (search) query.set('search', search);
  if (officeId) query.set('officeId', officeId);
  if (assignedTo) query.set('assignedTo', assignedTo);
  if (salesStageId) query.set('salesStageId', salesStageId);
  if (temperature) query.set('temperature', temperature);
  query.set('page', String(page));
  query.set('pageSize', String(PAGE_SIZE));

  const [clients, offices, salesStages, users] = await Promise.all([
    serverFetchApi<PagedResult<ClientListItem>>(`/clients?${query.toString()}`),
    serverFetchApi<Office[]>('/offices'),
    serverFetchApi<SalesStage[]>('/sales-stages'),
    serverFetchApi<UserSummary[]>('/users'),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" nativeButton={false} render={<Link href="/clients/new" />}>
          <Plus className="size-4" />
          新規クライアント登録
        </Button>
      </div>

      <ClientsFilterBar offices={offices} salesStages={salesStages} users={users} />

      <ClientsTable items={clients.items} />

      <PaginationBar page={clients.page} pageSize={clients.pageSize} total={clients.total} />
    </div>
  );
}
