import { plainToInstance } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUrl, Max, Min, validateSync } from 'class-validator';

/**
 * 起動時に検証する環境変数の定義。
 * 不足・不正な値がある場合はアプリ起動時に例外を投げて即座に気付けるようにする。
 */
class EnvironmentVariables {
  @IsUrl({ require_tld: false }, { message: 'SUPABASE_URL must be a valid URL (e.g. https://xxxx.supabase.co)' })
  SUPABASE_URL!: string;

  @IsString()
  SUPABASE_ANON_KEY!: string;

  /**
   * service_role key。RLSを完全にバイパスするため、通常のAPIリクエスト処理では使わない。
   * 現状ではアラート再計算バッチ(STEP11)でのみ使用する。未設定でもアプリ自体は起動できるが、
   * その場合アラート再計算機能は無効になる（AlertsServiceが明示的なエラーを返す）。
   */
  @IsOptional()
  @IsString()
  SUPABASE_SERVICE_ROLE_KEY?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number;
}

/**
 * ConfigModule.forRoot({ validate }) に渡すバリデーション関数。
 * `.env` (または実行環境の環境変数) の内容をチェックし、問題があれば
 * わかりやすいメッセージとともに起動を失敗させる。
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join('; ');
    throw new Error(`Invalid environment variables: ${messages}`);
  }

  return validatedConfig;
}
