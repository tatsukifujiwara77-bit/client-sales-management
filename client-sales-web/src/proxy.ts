import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Next.js 16: `middleware.ts` はdeprecatedとなり `proxy.ts` に改名された
// （エクスポート名も `middleware` → `proxy`）。処理内容は同じ。
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 以下を除くすべてのリクエストパスにマッチする:
     * - _next/static, _next/image (静的アセット)
     * - favicon.ico
     * - 画像ファイル
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
