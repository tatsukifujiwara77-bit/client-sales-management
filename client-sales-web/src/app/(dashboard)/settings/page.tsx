import { serverFetchApi } from '@/lib/api/server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SalesStagesSettings } from '@/components/settings/sales-stages-settings';
import { AlertSettingsForm } from '@/components/settings/alert-settings-form';
import type { AlertSetting, SalesStage } from '@/lib/api/types';

export default async function SettingsPage() {
  const [salesStages, alertSettings] = await Promise.all([
    serverFetchApi<SalesStage[]>('/sales-stages'),
    serverFetchApi<AlertSetting[]>('/alert-settings'),
  ]);

  return (
    <Tabs defaultValue="sales-stages">
      <TabsList>
        <TabsTrigger value="sales-stages">営業フェーズ管理</TabsTrigger>
        <TabsTrigger value="alert-settings">アラート設定</TabsTrigger>
      </TabsList>

      <TabsContent value="sales-stages" className="mt-4">
        <SalesStagesSettings stages={salesStages} />
      </TabsContent>
      <TabsContent value="alert-settings" className="mt-4">
        <AlertSettingsForm settings={alertSettings} />
      </TabsContent>
    </Tabs>
  );
}
