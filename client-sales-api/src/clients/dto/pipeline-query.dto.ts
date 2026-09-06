import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { TEMPERATURES, type Temperature } from './create-client.dto.js';

/**
 * GET /clients/pipeline のクエリパラメータ。
 * 営業進捗のKanban表示（設計書 11.4「営業進捗UI」）用に、フェーズごとに
 * クライアントをグルーピングして返す。
 */
export class PipelineQueryDto {
  @IsOptional()
  @IsUUID()
  officeId?: string;

  @IsOptional()
  @IsIn(TEMPERATURES)
  temperature?: Temperature;

  @IsOptional()
  @IsString()
  search?: string;

  /** 各カラム(フェーズ)に表示するクライアント件数の上限。総数は別途 count で返す。 */
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(200)
  perColumnLimit?: number = 50;
}
