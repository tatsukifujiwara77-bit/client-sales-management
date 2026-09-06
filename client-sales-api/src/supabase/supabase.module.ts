import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_CLIENT, SUPABASE_SERVICE_ROLE_CLIENT } from './supabase.constants.js';
import { SupabaseRequestService } from './supabase-request.service.js';

/**
 * Supabaseアクセスの土台となるModule。
 * - SUPABASE_ANON_CLIENT: anon keyのみのシングルトンクライアント
 *   （ヘルスチェックや、AuthGuardでのJWT検証(auth.getUser)に使用）
 * - SUPABASE_SERVICE_ROLE_CLIENT: service_role keyのシングルトンクライアント。
 *   RLSを完全にバイパスするため、アラート再計算バッチ等の限定的な場所でのみ使用する。
 *   SUPABASE_SERVICE_ROLE_KEY 未設定時はnullになり、その機能だけが無効になる
 *   （アプリ全体の起動は妨げない）。
 * - SupabaseRequestService: リクエストスコープの認証済みクライアントを提供
 *
 * @Global() にして、各機能モジュールで毎回importせずに使えるようにする。
 */
@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_ANON_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url = configService.getOrThrow<string>('SUPABASE_URL');
        const anonKey = configService.getOrThrow<string>('SUPABASE_ANON_KEY');
        return createClient(url, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      },
    },
    {
      provide: SUPABASE_SERVICE_ROLE_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url = configService.getOrThrow<string>('SUPABASE_URL');
        const serviceRoleKey = configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
        if (!serviceRoleKey) {
          return null;
        }
        return createClient(url, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      },
    },
    SupabaseRequestService,
  ],
  exports: [SUPABASE_ANON_CLIENT, SUPABASE_SERVICE_ROLE_CLIENT, SupabaseRequestService],
})
export class SupabaseModule {}
