import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * このデコレータを付与したハンドラ/コントローラは SupabaseAuthGuard による
 * 認証チェックをスキップする（例: GET /health, GET / のような公開エンドポイント）。
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
