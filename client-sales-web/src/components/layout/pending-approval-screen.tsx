'use client';

import { useRouter } from 'next/navigation';
import { Building2, LogOut, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

/**
 * ログイン(Google認証)は成功したが、profilesがまだ承認待ち(is_active=false)、
 * または存在しないユーザーに表示する画面。
 * ダッシュボードのサイドバー/ヘッダーは出さず、単独の全画面メッセージにする。
 */
export function PendingApprovalScreen({ fullName }: { fullName?: string }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.62_0.18_255)] to-[oklch(0.55_0.19_292)] text-white shadow-soft">
        <Building2 className="size-7" />
      </div>

      <div className="max-w-sm space-y-2">
        <div className="flex items-center justify-center gap-2 text-foreground">
          <ShieldCheck className="size-5 text-info" />
          <p className="text-lg font-semibold">承認待ちです</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {fullName ? `${fullName}さん、` : ''}
          ログインは完了しましたが、このアカウントはまだ管理者の承認を受けていません。
        </p>
        <p className="text-sm text-muted-foreground">
          管理者に利用開始の許可を依頼してください。承認され次第、ログインし直すとご利用いただけます。
        </p>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={handleLogout}>
        <LogOut className="size-3.5" />
        ログアウト
      </Button>
    </div>
  );
}
