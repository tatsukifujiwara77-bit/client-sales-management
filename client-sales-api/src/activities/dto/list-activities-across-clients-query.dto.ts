import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ACTIVITY_TYPES, type ActivityType } from './create-activity.dto.js';

/**
 * GET /activities（クライアント横断の営業活動一覧）のクエリパラメータ。
 * 設計書 11.4「営業活動タイムライン」の画面用。
 * ダッシュボードの findRecentAcrossClients（直近N件、フィルタ無し）とは別に、
 * ページネーション・絞り込みに対応したもの。
 */
export class ListActivitiesAcrossClientsQueryDto {
  @IsOptional()
  @IsIn(ACTIVITY_TYPES)
  activityType?: ActivityType;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

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
