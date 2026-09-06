'use client';

import { createClient } from '@/lib/supabase/client';
import { fetchApi, type FetchApiOptions } from './fetch-api';

/** クライアントコンポーネントから、現在のセッションでNestJS APIを呼ぶ */
export async function clientFetchApi<T>(path: string, options: FetchApiOptions = {}): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return fetchApi<T>(path, { ...options, accessToken: session?.access_token });
}
