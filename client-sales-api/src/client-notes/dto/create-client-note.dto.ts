import { IsNotEmpty, IsString } from 'class-validator';

/**
 * 常設メモ（クライアントについて常に知っておくべきこと）の登録用DTO。
 * 商談ごとのメモ(activities.notes、STEP9)とは明確に区別する。
 */
export class CreateClientNoteDto {
  @IsString()
  @IsNotEmpty()
  content!: string;
}
