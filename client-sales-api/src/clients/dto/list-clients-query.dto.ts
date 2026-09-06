import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { TEMPERATURES, type Temperature } from './create-client.dto.js';

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
