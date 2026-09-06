import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { serverFetchApi } from '@/lib/api/server';
import { ClientForm } from '@/components/clients/client-form';
import type { ClientDetail, Office, SalesStage } from '@/lib/api/types';

export default async function EditClientPage({ params }: PageProps<'/clients/[id]/edit'>) {
  const { id } = await params;

  const [client, offices, salesStages] = await Promise.all([
    serverFetchApi<ClientDetail>(`/clients/${id}`),
    serverFetchApi<Office[]>('/offices'),
    serverFetchApi<SalesStage[]>('/sales-stages'),
  ]);

  return (
    <div className="space-y-3">
      <Link
        href={`/clients/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        クライアント詳細へ戻る
      </Link>
      <h1 className="text-xl font-semibold text-foreground">{client.companyName} の編集</h1>
      <ClientForm offices={offices} salesStages={salesStages} client={client} />
    </div>
  );
}
