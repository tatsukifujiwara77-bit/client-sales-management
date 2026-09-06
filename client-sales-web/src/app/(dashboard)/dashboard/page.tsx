import { Building2, MessageCircle, Phone, UserPlus } from 'lucide-react';
import { serverFetchApi } from '@/lib/api/server';
import { HeroBanner } from '@/components/dashboard/hero-banner';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { PipelineChart } from '@/components/dashboard/pipeline-chart';
import { TemperatureBreakdownCard } from '@/components/dashboard/temperature-breakdown-card';
import { AlertsCard } from '@/components/dashboard/alerts-card';
import { RecentActivitiesCard } from '@/components/dashboard/recent-activities-card';
import { UpcomingActionsCard } from '@/components/dashboard/upcoming-actions-card';
import { NoVisitClientsCard } from '@/components/dashboard/no-visit-clients-card';
import { ClientMapLoader } from '@/components/dashboard/client-map-loader';
import type { DashboardResponse, MapClientPin, MeResponse } from '@/lib/api/types';

export default async function DashboardPage() {
  const [user, dashboard, mapPins] = await Promise.all([
    serverFetchApi<MeResponse>('/me'),
    serverFetchApi<DashboardResponse>('/dashboard'),
    serverFetchApi<MapClientPin[]>('/map/clients?limit=200').catch(() => []),
  ]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <HeroBanner userName={user.fullName} weeklyVisitCount={dashboard.kpis.visits.count} />

        {/* 今月の営業活動 KPI */}
        <div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              icon={Building2}
              iconClassName="bg-gradient-to-br from-[oklch(0.62_0.15_255)]/25 to-[oklch(0.78_0.11_200)]/25 text-[oklch(0.45_0.17_255)]"
              glowClassName="bg-[oklch(0.62_0.15_255)]/20"
              label="訪問"
              unit="件"
              metric={dashboard.kpis.visits}
            />
            <KpiCard
              icon={MessageCircle}
              iconClassName="bg-gradient-to-br from-[oklch(0.68_0.15_152)]/25 to-[oklch(0.8_0.11_165)]/25 text-[oklch(0.45_0.14_152)]"
              glowClassName="bg-[oklch(0.68_0.15_152)]/20"
              label="商談"
              unit="件"
              metric={dashboard.kpis.meetings}
            />
            <KpiCard
              icon={Phone}
              iconClassName="bg-gradient-to-br from-[oklch(0.75_0.16_55)]/30 to-[oklch(0.85_0.14_90)]/30 text-[oklch(0.5_0.16_45)]"
              glowClassName="bg-[oklch(0.75_0.16_55)]/25"
              label="電話"
              unit="件"
              metric={dashboard.kpis.calls}
            />
            <KpiCard
              icon={UserPlus}
              iconClassName="bg-gradient-to-br from-[oklch(0.58_0.19_297)]/25 to-[oklch(0.75_0.1_300)]/25 text-[oklch(0.45_0.19_297)]"
              glowClassName="bg-[oklch(0.58_0.19_297)]/20"
              label="新規開拓"
              unit="社"
              metric={dashboard.kpis.newClients}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PipelineChart pipeline={dashboard.pipeline} />
          <TemperatureBreakdownCard breakdown={dashboard.temperatureBreakdown} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RecentActivitiesCard activities={dashboard.recentActivities} />
          <UpcomingActionsCard items={dashboard.upcomingActionItems} />
        </div>

        <NoVisitClientsCard clients={dashboard.noVisitClients} />
      </div>

      <div className="space-y-4 xl:col-span-1">
        <AlertsCard counts={dashboard.alertCounts} />
        <ClientMapLoader initialPins={mapPins} />
      </div>
    </div>
  );
}
