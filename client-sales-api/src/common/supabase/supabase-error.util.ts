import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';

const logger = new Logger('SupabaseError');

/**
 * Supabase(PostgREST/Postgres)のエラーをNestJSの例外に変換する。
 *
 * 注意: これは「誰が何にアクセスできるか」を判定するロジックではない。
 * その判定は常にPostgres側のRLSが既に下しており、ここではその結果
 * （エラーコード）を適切なHTTPレスポンス形式に翻訳しているだけ。
 *
 * @param error   supabase-jsのクエリ結果に含まれるエラー（無ければ何もしない）
 * @param options.entityName  404メッセージ等に使う対象名（例: "Client"）
 */
export function throwIfSupabaseError(
  error: PostgrestError | null | undefined,
  options: { entityName?: string } = {},
): void {
  if (!error) {
    return;
  }

  const entityName = options.entityName ?? 'Resource';

  switch (error.code) {
    // .single()/.maybeSingle() で0件 or 複数件だった場合
    case 'PGRST116':
      throw new NotFoundException(`${entityName} not found.`);
    // unique_violation
    case '23505':
      throw new ConflictException(`${entityName} already exists or violates a uniqueness constraint.`);
    // foreign_key_violation
    case '23503':
      throw new BadRequestException('A referenced resource does not exist.');
    // not_null_violation
    case '23502':
      throw new BadRequestException('A required field is missing.');
    // check_violation (enumのcheck制約など)
    case '23514':
      throw new BadRequestException('One or more fields have an invalid value.');
    // invalid_text_representation（不正なUUID形式など）
    case '22P02':
      throw new BadRequestException('One or more fields have an invalid format.');
    // insufficient_privilege（RLSにより拒否）
    case '42501':
      throw new ForbiddenException('You do not have permission to perform this action.');
    default:
      logger.error(`Unhandled Supabase error [${error.code}]: ${error.message}`, error.details ?? undefined);
      throw new InternalServerErrorException('An unexpected database error occurred.');
  }
}
