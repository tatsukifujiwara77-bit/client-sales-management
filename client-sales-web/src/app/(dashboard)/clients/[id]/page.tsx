import { serverFetchApi } from '@/lib/api/server';
import { ClientDetailHeader } from '@/components/clients/detail/client-detail-header';
import { ClientDetailTabs } from '@/components/clients/detail/client-detail-tabs';
import type { ActionItem, Activity, Alert, ClientDossier, PagedResult } from '@/lib/api/types';

interface AlertsDashboardResponse {
  alerts: PagedResult<Alert>;
}

export default async function ClientDetailPage({ params }: PageProps<'/clients/[id]'>) {
  const { id } = await params;

  const [dossier, activities, actionItems, alertsResponse] = await Promise.all([
    serverFetchApi<ClientDossier>(`/clients/${id}/dossier`),
    serverFetchApi<PagedResult<Activity>>(`/clients/${id}/activities`),
    serverFetchApi<PagedResult<ActionItem>>(`/clients/${id}/action-items`),
    // refresh=true: このクライアントのアラートだけを対象にした軽い再計算なので、
    // 詳細ページを開くたびに実行しても問題ない(全クライアント分の再計算とは別)。
    serverFetchApi<AlertsDashboardResponse>(`/clients/${id}/alerts?refresh=true`),
  ]);

  return (
    <div className="space-y-4">
      <ClientDetailHeader client={dossier.client} nextAction={dossier.nextActionItem} />
      <ClientDetailTabs
        client={dossier.client}
        contacts={dossier.contacts}
        notes={dossier.notes}
        activities={activities.items}
        actionItems={actionItems.items}
        alerts={alertsResponse.alerts.items}
      />
    </div>
  );
}
