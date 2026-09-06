import { createClient } from '@/lib/supabase/server';
import { fetchApi, type FetchApiOptions } from './fetch-api';

/** サーバーコンポーネント／Route Handlerから、現在のセッションでNestJS APIを呼ぶ */
export async function serverFetchApi<T>(path: string, options: FetchApiOptions = {}): Promise<T> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return fetchApi<T>(path, { ...options, accessToken: session?.access_token });
}
