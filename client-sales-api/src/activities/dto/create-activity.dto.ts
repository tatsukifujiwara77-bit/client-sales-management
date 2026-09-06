import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export const ACTIVITY_TYPES = ['visit', 'meeting', 'call', 'email', 'online', 'other'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/**
 * 営業活動履歴の登録用DTO（設計書 8.1/8.2）。
 * 次回アクション・次回予定日は action_items 側の責務(STEP10)のため、
 * このDTOには含めない。
 */
export class CreateActivityDto {
  @IsIn(ACTIVITY_TYPES)
  activityType!: ActivityType;

  /** 活動日 (YYYY-MM-DD) */
  @IsDateString()
  activityDate!: string;

  /** 実施した担当者。省略時はリクエストを行った本人になる。 */
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  /** 参加者（自由記述。例:「南国殖産:髙江洲様/当社:藤原」） */
  @IsOptional()
  @IsString()
  participants?: string;

  /** 商談メモ。見出し・箇条書き・改行を含む長文を想定（設計書 9章）。 */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  notes?: string;
}
