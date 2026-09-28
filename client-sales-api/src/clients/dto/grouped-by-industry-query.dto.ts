import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { TEMPERATURES, type Temperature } from './create-client.dto.js';

const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  return value;
};

const toStringArray = ({ value }: { value: unknown }): unknown => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.length > 0) return value.split(',');
  return value;
};

/**
 * GET /clients/grouped-by-industry のクエリパラメータ。
 * ListClientsQueryDtoと同じ絞り込み項目(ページングを除く)を、業種ごとのグループ表示用に受け取る。
 */
export class GroupedByIndustryQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  officeId?: string;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsUUID()
  salesStageId?: string;

  @IsOptional()
  @IsIn(TEMPERATURES)
  temperature?: Temperature;

  @IsOptional()
  @IsString()
  prefecture?: string;

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  industryIds?: string[];

  /** true: 営業終了フェーズのみ / false: 営業終了以外のみ */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isClosed?: boolean;

  /** 各業種グループに表示するクライアント件数の上限。総数は別途 count で返す。 */
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(200)
  perColumnLimit?: number = 50;
}
