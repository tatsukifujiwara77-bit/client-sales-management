import { ApiError, type ApiErrorBody } from './errors';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface FetchApiOptions extends Omit<RequestInit, 'body'> {
  accessToken?: string | null;
  /** JSONとして送るボディ（オブジェクトを渡せば自動でJSON.stringifyされる） */
  body?: unknown;
}

/**
 * NestJS API（client-sales-api）を呼ぶ共通fetchラッパー。
 * - Authorizationヘッダーを自動付与
 * - レスポンスをJSONとしてパース
 * - エラー時はAllExceptionsFilterの形式を読み取り、ApiErrorとして投げる
 *
 * サーバーコンポーネント／クライアントコンポーネントのどちらからでも呼べるよう、
 * accessTokenの取得方法（Cookie経由 or ブラウザSupabaseクライアント経由）は
 * 呼び出し側（src/lib/api/server.ts, src/lib/api/client.ts）に委ねる。
 */
export async function fetchApi<T>(path: string, options: FetchApiOptions = {}): Promise<T> {
  const { accessToken, headers, body, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  // 204 No Content 等、ボディが無いレスポンス
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const errorBody = data as ApiErrorBody | null;
    const message = Array.isArray(errorBody?.message)
      ? errorBody.message.join(' / ')
      : (errorBody?.message ?? response.statusText);
    throw new ApiError(response.status, message, errorBody);
  }

  return data as T;
}
