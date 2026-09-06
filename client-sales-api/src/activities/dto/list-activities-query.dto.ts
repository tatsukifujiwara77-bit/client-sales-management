import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ACTIVITY_TYPES, type ActivityType } from './create-activity.dto.js';

/**
 * GET /clients/:clientId/activities のクエリパラメータ。
 * activityType を絞ることで「訪問履歴のみ」「商談履歴のみ」等の表示にも対応する
 * （設計書 8〜10章：営業活動履歴/訪問履歴/商談履歴）。
 */
export class ListActivitiesQueryDto {
  @IsOptional()
  @IsIn(ACTIVITY_TYPES)
  activityType?: ActivityType;

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
  @Max(200)
  pageSize?: number = 50;
}
