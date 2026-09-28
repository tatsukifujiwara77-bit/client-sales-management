import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { serverFetchApi } from '@/lib/api/server';
import { ClientForm } from '@/components/clients/client-form';
import type { Industry, Office, SalesStage, UserSummary } from '@/lib/api/types';

export default async function NewSalesListEntryPage() {
  const [offices, salesStages, industries, users] = await Promise.all([
    serverFetchApi<Office[]>('/offices'),
    serverFetchApi<SalesStage[]>('/sales-stages'),
    serverFetchApi<Industry[]>('/industries'),
    serverFetchApi<UserSummary[]>('/users'),
  ]);

  return (
    <div className="space-y-3">
      <Link
        href="/sales-list"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        営業リストへ戻る
      </Link>
      <h1 className="text-xl font-semibold text-foreground">新規リスト登録</h1>
      <ClientForm
        offices={offices}
        salesStages={salesStages}
        users={users}
        industries={industries}
        basePath="/sales-list"
      />
    </div>
  );
}
