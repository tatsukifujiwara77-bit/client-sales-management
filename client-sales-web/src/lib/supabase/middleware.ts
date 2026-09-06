import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** ログインチェックをスキップするパス（ログイン画面自体・OAuthコールバック・静的アセット） */
function isPublicPath(pathname: string): boolean {
  return pathname.startsWith('/login') || pathname.startsWith('/auth');
}

/**
 * 全リクエストで実行され、Supabaseセッションの検証・更新を行う。
 * - 未ログインで保護ページにアクセス → /login へリダイレクト
 * - ログイン済みで /login にアクセス → /dashboard へリダイレクト
 * - それ以外はセッションCookieを更新しつつそのまま通す
 *
 * @supabase/ssr の標準パターン（Middlewareでのセッション更新）に準拠。
 * https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() はSupabase Authサーバーに問い合わせてトークンを検証する
  // （Cookieの中身をそのまま信用するgetSession()は使わない）。
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
