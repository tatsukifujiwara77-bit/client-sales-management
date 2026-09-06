import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export const NOTIFY_BEFORE_VALUES = ['1_day', '3_days', '1_week', 'none'] as const;
export type NotifyBefore = (typeof NOTIFY_BEFORE_VALUES)[number];

/**
 * 次回アクションの登録用DTO（設計書 12章／7.1 通知タイミング）。
 * サイクル: 訪問 → 次回アクション → アラート → 対応(活動記録) → 次回アクション
 */
export class CreateActionItemDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  /** 次回予定日 */
  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsIn(NOTIFY_BEFORE_VALUES)
  notifyBefore?: NotifyBefore;

  /** 担当者。省略時はリクエストを行った本人になる。 */
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  /** どの活動から生まれた次回アクションか（任意） */
  @IsOptional()
  @IsUUID()
  sourceActivityId?: string;
}
