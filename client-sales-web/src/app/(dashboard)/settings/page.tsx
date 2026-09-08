import { serverFetchApi } from '@/lib/api/server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SalesStagesSettings } from '@/components/settings/sales-stages-settings';
import { AlertSettingsForm } from '@/components/settings/alert-settings-form';
import { PendingUsersSettings } from '@/components/settings/pending-users-settings';
import { BackfillGeocodingButton } from '@/components/settings/backfill-geocoding-button';
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
    <div className="space-y-4">
      {isAdmin ? (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
          <div>
            <p className="text-sm font-medium text-foreground">クライアントの座標(地図表示用)を一括更新</p>
            <p className="text-xs text-muted-foreground">
              所在地はあるが座標が未設定のクライアントをまとめてジオコーディングします。
            </p>
          </div>
          <BackfillGeocodingButton />
        </div>
      ) : null}

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
    </div>
  );
}
