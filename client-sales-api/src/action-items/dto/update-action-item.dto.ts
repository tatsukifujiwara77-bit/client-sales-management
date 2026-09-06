import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { CreateActionItemDto } from './create-action-item.dto.js';

export const UPDATABLE_STATUSES = ['pending', 'cancelled'] as const;
export type UpdatableStatus = (typeof UPDATABLE_STATUSES)[number];

/**
 * 次回アクションの更新用DTO。
 *
 * status は 'pending' / 'cancelled' のみ許可する（'done' にはできない）。
 * 「対応済み」にする操作は、活動記録・次回アクション作成とセットになる
 * 専用の POST /action-items/:id/complete を通す設計にしているため
 * （このエンドポイントで status=done を直接受け付けると、
 *  completed_at / completed_activity_id との整合性が崩れる）。
 *
 * sourceActivityId（どの活動から生まれたか）は履歴的事実のため編集対象外。
 */
export class UpdateActionItemDto extends PartialType(
  OmitType(CreateActionItemDto, ['sourceActivityId'] as const),
) {
  @IsOptional()
  @IsIn(UPDATABLE_STATUSES)
  status?: UpdatableStatus;
}
