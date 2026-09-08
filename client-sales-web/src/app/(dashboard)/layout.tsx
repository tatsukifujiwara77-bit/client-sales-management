import { Toaster } from 'sonner';
import { serverFetchApi } from '@/lib/api/server';
import { ApiError } from '@/lib/api/errors';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { PendingApprovalScreen } from '@/components/layout/pending-approval-screen';
import type { AlertCounts, MeResponse, PendingUser } from '@/lib/api/types';

/**
 * GoogleアカウントのプロフィールアイコンURLを取得する。
 * profilesテーブルにも保存せず、都度Supabase Authのセッションから読む
 * （Google側でアイコンが変わった場合もDBの同期処理なしに常に最新が反映される）。
 */
async function getGoogleAvatarUrl(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const avatarUrl = metadata?.avatar_url ?? metadata?.picture;
  return typeof avatarUrl === 'string' ? avatarUrl : null;
}

interface AlertCountsResponse {
  counts: AlertCounts;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts (旧middleware) が未ログイン時に /login へリダイレクトするため、
  // ここに到達している時点でSupabase認証自体は済んでいることが前提。
  // ただし「Googleログインはできるがprofilesが承認待ち(is_active=false)/未作成」の
  // ユーザーは、/me が401を返す（SupabaseAuthGuard参照）。その場合はダッシュボードの
  // 代わりに承認待ち画面を出す（エラー画面にはしない）。
  const meRequest = serverFetchApi<MeResponse>('/me');
  const alertsRequest = serverFetchApi<AlertCountsResponse>('/alerts').catch(() => null);
  const avatarUrlRequest = getGoogleAvatarUrl().catch(() => null);

  let user: MeResponse;
  try {
    user = await meRequest;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      return <PendingApprovalScreen />;
    }
    throw error;
  }

  const isAdmin = user.role === 'admin';
  const pendingUsersRequest = isAdmin
    ? serverFetchApi<PendingUser[]>('/users/pending').catch(() => [])
    : Promise.resolve<PendingUser[]>([]);

  const [alertCounts, pendingUsers, avatarUrl] = await Promise.all([
    alertsRequest,
    pendingUsersRequest,
    avatarUrlRequest,
  ]);

  const totalAlerts = alertCounts
    ? alertCounts.counts.overdue + alertCounts.counts.dueToday + alertCounts.counts.dueThisWeek + alertCounts.counts.noVisit
    : undefined;
  const pendingUsersCount = pendingUsers.length;

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <Sidebar user={user} alertCount={totalAlerts} avatarUrl={avatarUrl} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={user}
          alertCount={totalAlerts}
          alertCounts={alertCounts?.counts}
          pendingUsersCount={isAdmin ? pendingUsersCount : undefined}
          avatarUrl={avatarUrl}
        />
        <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,oklch(0.94_0.025_255),transparent)] p-4 md:p-6">
          {children}
        </main>
      </div>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
