import {
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { SUPABASE_ANON_CLIENT } from '../../supabase/supabase.constants.js';
import type { AuthUser, AuthenticatedRequest } from '../types/authenticated-request.js';

interface ProfileRow {
  id: string;
  full_name: string;
  role: AuthUser['role'];
  office_id: string | null;
  is_active: boolean;
}

/**
 * 全エンドポイントに適用されるグローバルGuard。
 *
 * 1. @Public() が付いているハンドラは素通りさせる
 * 2. Authorization: Bearer <jwt> を取り出し、Supabase Authでトークンを検証する
 * 3. そのJWTをAuthorizationヘッダーに積んだ認証済みSupabaseクライアントを生成し、
 *    profiles テーブルから本人の行を取得して req.user にセットする
 *    （このクライアントは req.supabaseClient にも積み、以後のDBアクセスで再利用する）
 *
 * NestJS側では「誰が何にアクセスできるか」の判定は一切行わない。
 * それはPostgres側のRLSの責務であり、ここでは「誰としてアクセスするか」を
 * 確定させることだけが責務。
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    @Inject(SUPABASE_ANON_CLIENT) private readonly anonClient: SupabaseClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Authorization header (Bearer token) is required.');
    }

    const {
      data: { user },
      error: authError,
    } = await this.anonClient.auth.getUser(token);
    if (authError || !user) {
      throw new UnauthorizedException('Invalid or expired access token.');
    }

    const authenticatedClient = this.createAuthenticatedClient(token);
    const { data: profile, error: profileError } = await authenticatedClient
      .from('profiles')
      .select('id, full_name, role, office_id, is_active')
      .eq('id', user.id)
      .maybeSingle<ProfileRow>();

    if (profileError) {
      throw new UnauthorizedException('Failed to resolve the authenticated user profile.');
    }
    if (!profile) {
      throw new UnauthorizedException('No profile is associated with this account.');
    }
    if (!profile.is_active) {
      throw new UnauthorizedException('This account has been deactivated.');
    }

    request.user = {
      id: profile.id,
      email: user.email ?? null,
      fullName: profile.full_name,
      role: profile.role,
      officeId: profile.office_id,
      isActive: profile.is_active,
    };
    request.supabaseClient = authenticatedClient;

    return true;
  }

  private extractBearerToken(request: AuthenticatedRequest): string | undefined {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return undefined;
    }
    return header.slice('Bearer '.length).trim();
  }

  private createAuthenticatedClient(token: string): SupabaseClient {
    const url = this.configService.getOrThrow<string>('SUPABASE_URL');
    const anonKey = this.configService.getOrThrow<string>('SUPABASE_ANON_KEY');
    return createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }
}
