import { Toaster } from 'sonner';
import { serverFetchApi } from '@/lib/api/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import type { MeResponse } from '@/lib/api/types';

interface AlertCountsResponse {
  counts: { overdue: number; dueToday: number; dueThisWeek: number; noVisit: number };
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts (旧middleware) が未ログイン時に /login へリダイレクトするため、
  // ここに到達している時点でログイン済みであることが前提。
  const [user, alertCounts] = await Promise.all([
    serverFetchApi<MeResponse>('/me'),
    serverFetchApi<AlertCountsResponse>('/alerts').catch(() => null),
  ]);

  const totalAlerts = alertCounts
    ? alertCounts.counts.overdue + alertCounts.counts.dueToday + alertCounts.counts.dueThisWeek + alertCounts.counts.noVisit
    : undefined;

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <Sidebar user={user} alertCount={totalAlerts} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} alertCount={totalAlerts} />
        <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,oklch(0.94_0.025_255),transparent)] p-4 md:p-6">
          {children}
        </main>
      </div>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
