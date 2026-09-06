'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Building2, Loader2, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

/** Googleの4色ロゴ（アイコンフォントを追加せず、この画面専用のインラインSVGとして持つ） */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-4.5" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

/** ログイン画面の背景装飾（濃紺グラデーション＋うっすらとしたリング）。サイドバーの配色と揃えている。 */
function BackgroundDecoration() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-40 -left-40 size-[32rem] rounded-full border border-white/10" />
      <div className="absolute -bottom-48 -right-48 size-[36rem] rounded-full border border-white/10" />
      <div className="absolute top-1/3 left-1/4 size-72 rounded-full bg-[oklch(0.55_0.19_258)]/20 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 size-72 rounded-full bg-[oklch(0.56_0.19_297)]/15 blur-3xl" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard';
  const callbackError = searchParams.get('error');

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    callbackError ? 'Googleログインに失敗しました。もう一度お試しください。' : null,
  );

  async function handleGoogleLogin() {
    setErrorMessage(null);
    setIsGoogleLoading(true);

    const supabase = createClient();
    const callbackUrl = new URL('/auth/callback', window.location.origin);
    callbackUrl.searchParams.set('redirectTo', redirectTo);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl.toString() },
    });

    if (error) {
      setErrorMessage('Googleログインを開始できませんでした。');
      setIsGoogleLoading(false);
    }
    // 成功時はSupabaseがGoogleの認可画面へリダイレクトするため、ここでは何もしない。
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-gradient-to-br from-[oklch(0.2_0.03_255)] via-[oklch(0.26_0.05_265)] to-[oklch(0.18_0.03_255)] px-4">
      <BackgroundDecoration />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6">
        <div className="w-full rounded-2xl bg-white p-8 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.62_0.18_255)] to-[oklch(0.55_0.19_292)] text-white shadow-soft">
              <Building2 className="size-7" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">クライアント営業管理</p>
              <p className="text-xs text-muted-foreground">GMO CONNECT HR</p>
            </div>
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            社内システム
            <div className="h-px flex-1 bg-border" />
          </div>

          {errorMessage ? <p className="mb-4 text-center text-sm text-destructive">{errorMessage}</p> : null}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isGoogleLoading}
            onClick={handleGoogleLogin}
          >
            {isGoogleLoading ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
            Googleでログイン
          </Button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" />
            社内アカウントのみご利用いただけます
          </p>
        </div>

        <p className="text-xs text-white/50">© GMO CONNECT HR</p>
      </div>
    </div>
  );
}
