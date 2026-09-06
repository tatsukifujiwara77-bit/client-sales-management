import { serverFetchApi } from '@/lib/api/server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SalesStagesSettings } from '@/components/settings/sales-stages-settings';
import { AlertSettingsForm } from '@/components/settings/alert-settings-form';
import { PendingUsersSettings } from '@/components/settings/pending-users-settings';
import type { AlertSetting, MeResponse, Office, PendingUser, SalesStage } from '@/lib/api/types';

export default async function SettingsPage() {
  const [me, salesStages, alertSettings] = await Promise.all([
    serverFetchApi<MeResponse>('/me'),
    serverFetchApi<SalesStage[]>('/sales-stages'),
    serverFetchApi<AlertSetting[]>('/alert-settings'),
  ]);

  const isAdmin = me.role === 'admin';
  const [pendingUsers, offices] = isAdmin
    ? await Promise.all([
        serverFetchApi<PendingUser[]>('/users/pending'),
        serverFetchApi<Office[]>('/offices'),
      ])
    : [[], []];

  return (
    <Tabs defaultValue="sales-stages">
      <TabsList>
        <TabsTrigger value="sales-stages">営業フェーズ管理</TabsTrigger>
        <TabsTrigger value="alert-settings">アラート設定</TabsTrigger>
        {isAdmin ? <TabsTrigger value="pending-users">ユーザー承認</TabsTrigger> : null}
      </TabsList>

      <TabsContent value="sales-stages" className="mt-4">
        <SalesStagesSettings stages={salesStages} />
      </TabsContent>
      <TabsContent value="alert-settings" className="mt-4">
        <AlertSettingsForm settings={alertSettings} />
      </TabsContent>
      {isAdmin ? (
        <TabsContent value="pending-users" className="mt-4">
          <PendingUsersSettings users={pendingUsers} offices={offices} />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
