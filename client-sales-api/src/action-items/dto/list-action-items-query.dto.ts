import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export const ACTION_ITEM_STATUSES = ['pending', 'done', 'cancelled'] as const;
export type ActionItemStatus = (typeof ACTION_ITEM_STATUSES)[number];

/** GET /clients/:clientId/action-items のクエリパラメータ */
export class ListActionItemsQueryDto {
  @IsOptional()
  @IsIn(ACTION_ITEM_STATUSES)
  status?: ActionItemStatus;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsDateString()
  dueBefore?: string;

  @IsOptional()
  @IsDateString()
  dueAfter?: string;

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
