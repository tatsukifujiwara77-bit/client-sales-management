import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { serverFetchApi } from '@/lib/api/server';
import { ClientForm } from '@/components/clients/client-form';
import type { Office, SalesStage } from '@/lib/api/types';

export default async function NewClientPage() {
  const [offices, salesStages] = await Promise.all([
    serverFetchApi<Office[]>('/offices'),
    serverFetchApi<SalesStage[]>('/sales-stages'),
  ]);

  return (
    <div className="space-y-3">
      <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        クライアント一覧へ戻る
      </Link>
      <h1 className="text-xl font-semibold text-foreground">新規クライアント登録</h1>
      <ClientForm offices={offices} salesStages={salesStages} />
    </div>
  );
}
