import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { ACTIVITY_TYPES, type ActivityType } from '../../activities/dto/create-activity.dto.js';
import { NOTIFY_BEFORE_VALUES, type NotifyBefore } from './create-action-item.dto.js';

/**
 * 「対応」時に残す活動記録。省略した場合は活動を作らずに完了扱いにする。
 */
export class CompleteActivityDto {
  @IsIn(ACTIVITY_TYPES)
  activityType!: ActivityType;

  /** 省略時は当日日付になる */
  @IsOptional()
  @IsDateString()
  activityDate?: string;

  @IsOptional()
  @IsString()
  participants?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * 対応と同時に作る次回アクション。
 * サイクル: 対応(活動記録) → 次回アクション、を1リクエストで完結させる。
 */
export class NextActionDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsIn(NOTIFY_BEFORE_VALUES)
  notifyBefore?: NotifyBefore;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;
}

/** POST /clients/:clientId/action-items/:actionItemId/complete */
export class CompleteActionItemDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CompleteActivityDto)
  activity?: CompleteActivityDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => NextActionDto)
  nextAction?: NextActionDto;
}
