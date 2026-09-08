import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const MEETING_TYPES = ['visit', 'online'] as const;
export type MeetingType = (typeof MEETING_TYPES)[number];

/**
 * 商談メモ（クライアントとの商談内容を都度記録するメモ）の登録用DTO。
 * 簡易的なメモとして運用する活動履歴(activities.notes、STEP9)とは明確に区別する。
 */
export class CreateClientNoteDto {
  /** 商談の実施形式（訪問／オンライン） */
  @IsIn(MEETING_TYPES)
  meetingType!: MeetingType;

  /** 参加者(当社) */
  @IsOptional()
  @IsString()
  participantsOwn?: string;

  /** 参加者(先方) */
  @IsOptional()
  @IsString()
  participantsClient?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}
