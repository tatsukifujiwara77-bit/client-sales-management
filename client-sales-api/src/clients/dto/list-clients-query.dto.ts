import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { TEMPERATURES, type Temperature } from './create-client.dto.js';

/** カンマ区切りのクエリ文字列を配列に変換する（業種の複数選択フィルタ用） */
const toStringArray = ({ value }: { value: unknown }): unknown => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.length > 0) return value.split(',');
  return value;
};

export const CLIENT_SORT_FIELDS = [
  'companyName',
  'lastVisitedAt',
  'lastActivityAt',
  'createdAt',
  'updatedAt',
] as const;
export type ClientSortField = (typeof CLIENT_SORT_FIELDS)[number];

const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  return value;
};

/**
 * GET /clients のクエリパラメータ。
 * 設計書 11.4「クライアント一覧」の検索・フィルター要件に対応する。
 */
export class ListClientsQueryDto {
  /** 会社名／所在地のフリーワード検索 */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  officeId?: string;

  /** 担当営業（client_assignments.user_id）でのフィルタ */
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsUUID()
  salesStageId?: string;

  @IsOptional()
  @IsIn(TEMPERATURES)
  temperature?: Temperature;

  /** 都道府県での絞り込み（単一選択） */
  @IsOptional()
  @IsString()
  prefecture?: string;

  /** 業種での絞り込み（複数選択・OR）。予約値'unassigned'で「未設定」を表す */
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

  @IsOptional()
  @IsIn(CLIENT_SORT_FIELDS)
  sortBy?: ClientSortField = 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
