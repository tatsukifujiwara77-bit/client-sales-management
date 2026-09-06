import { createBrowserClient } from '@supabase/ssr';

/**
 * ブラウザ（クライアントコンポーネント）用のSupabaseクライアント。
 * ログイン処理・セッション取得にのみ使う。データ操作は必ずNestJS API経由で行う
 * （src/lib/api-client.ts）。
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
