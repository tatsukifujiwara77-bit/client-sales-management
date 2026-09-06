'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewTab } from './overview-tab';
import { ActivitiesTab } from './activities-tab';
import { ActionItemsTab } from './action-items-tab';
import { AlertsTab } from './alerts-tab';
import { NotesTab } from './notes-tab';
import type { ActionItem, Activity, Alert, ClientContact, ClientDetail, ClientNote } from '@/lib/api/types';

interface ClientDetailTabsProps {
  client: ClientDetail;
  contacts: ClientContact[];
  notes: ClientNote[];
  activities: Activity[];
  actionItems: ActionItem[];
  alerts: Alert[];
}

export function ClientDetailTabs({
  client,
  contacts,
  notes,
  activities,
  actionItems,
  alerts,
}: ClientDetailTabsProps) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">概要</TabsTrigger>
        <TabsTrigger value="notes">メモ</TabsTrigger>
        <TabsTrigger value="activities">活動履歴</TabsTrigger>
        <TabsTrigger value="action-items">次回アクション</TabsTrigger>
        <TabsTrigger value="alerts">
          アラート
          {alerts.length > 0 ? (
            <span className="ml-1 inline-flex size-4.5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
              {alerts.length}
            </span>
          ) : null}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <OverviewTab client={client} contacts={contacts} />
      </TabsContent>
      <TabsContent value="notes" className="mt-4">
        <NotesTab clientId={client.id} notes={notes} />
      </TabsContent>
      <TabsContent value="activities" className="mt-4">
        <ActivitiesTab clientId={client.id} activities={activities} />
      </TabsContent>
      <TabsContent value="action-items" className="mt-4">
        <ActionItemsTab clientId={client.id} actionItems={actionItems} />
      </TabsContent>
      <TabsContent value="alerts" className="mt-4">
        <AlertsTab alerts={alerts} />
      </TabsContent>
    </Tabs>
  );
}
