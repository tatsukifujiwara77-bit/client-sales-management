import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.js';

/**
 * リクエストごとに「ログインユーザーのJWTをAuthorizationヘッダーに積んだ」
 * Supabaseクライアントを提供するサービス。
 *
 * - 保護対象のエンドポイント(SupabaseAuthGuardを通過済み)では、
 *   Guardが既に生成したクライアント(request.supabaseClient)をそのまま再利用する。
 * - @Public() なエンドポイントで、かつAuthorizationヘッダーが無い場合は
 *   anon key のみのクライアント(RLS上は anonymous ロール)を返す。
 *
 * NestJS側では「誰が何を見れるか」のロジックを再実装しない。
 * ここで返すクライアントに対する問い合わせは、すべてPostgresのRLSに委ねる。
 */
@Injectable({ scope: Scope.REQUEST })
export class SupabaseRequestService {
  private client?: SupabaseClient;

  constructor(
    @Inject(REQUEST) private readonly request: AuthenticatedRequest,
    private readonly configService: ConfigService,
  ) {}

  getClient(): SupabaseClient {
    if (this.request.supabaseClient) {
      return this.request.supabaseClient;
    }

    if (!this.client) {
      const url = this.configService.getOrThrow<string>('SUPABASE_URL');
      const anonKey = this.configService.getOrThrow<string>('SUPABASE_ANON_KEY');
      const token = this.extractBearerToken();

      this.client = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      });
    }

    return this.client;
  }

  private extractBearerToken(): string | undefined {
    const header = this.request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return undefined;
    }
    return header.slice('Bearer '.length).trim();
  }
}
