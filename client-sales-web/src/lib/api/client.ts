'use client';

import { createClient } from '@/lib/supabase/client';
import { fetchApi, uploadFile, type FetchApiOptions } from './fetch-api';

/** クライアントコンポーネントから、現在のセッションでNestJS APIを呼ぶ */
export async function clientFetchApi<T>(path: string, options: FetchApiOptions = {}): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return fetchApi<T>(path, { ...options, accessToken: session?.access_token });
}

/** クライアントコンポーネントから、現在のセッションでファイルをアップロードする(multipart/form-data) */
export async function clientUploadFile<T>(path: string, formData: FormData): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return uploadFile<T>(path, formData, { accessToken: session?.access_token });
}
