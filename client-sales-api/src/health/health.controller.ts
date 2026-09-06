import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator.js';

interface HealthCheckBody {
  status: 'ok' | 'error';
  supabase: 'ok' | 'error';
  timestamp: string;
}

@Controller('health')
export class HealthController {
  private static readonly TIMEOUT_MS = 3000;

  constructor(private readonly configService: ConfigService) {}

  /**
   * GET /health
   * Supabaseプロジェクトへの疎通確認（認証不要・@Public）。
   *
   * テーブルへのSELECTではなく、Supabase Auth(GoTrue)のヘルスエンドポイントを叩く。
   * 理由: このアプリのRLSはマスタ系テーブルも含め `to authenticated` でのみ
   * 許可しており、未ログイン(anon)ロールにはテーブル権限自体を与えていない
   * （設計通り）。そのため anon key での table select は常に 401 permission
   * denied になり疎通確認として成立しない。GoTrueのヘルスエンドポイントは
   * RLS/テーブル権限に依存せず、プロジェクトのSupabaseバックエンド自体が
   * 生きているかどうかだけを確認できる。
   */
  @Public()
  @Get()
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthCheckBody> {
    const supabaseStatus = await this.checkSupabase();
    res.status(supabaseStatus === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return {
      status: supabaseStatus,
      supabase: supabaseStatus,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkSupabase(): Promise<HealthCheckBody['supabase']> {
    const url = this.configService.getOrThrow<string>('SUPABASE_URL');
    const anonKey = this.configService.getOrThrow<string>('SUPABASE_ANON_KEY');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HealthController.TIMEOUT_MS);

    try {
      const response = await fetch(`${url}/auth/v1/health`, {
        headers: { apikey: anonKey },
        signal: controller.signal,
      });
      return response.ok ? 'ok' : 'error';
    } catch {
      return 'error';
    } finally {
      clearTimeout(timeout);
    }
  }
}
