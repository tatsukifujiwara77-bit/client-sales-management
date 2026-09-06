import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/**
 * PATCH /sales-stages/:id
 * 名称と並び順のみ変更可能（is_closed の意味を変える運用は想定していないため対象外）。
 * 書き込みはRLS上adminのみ許可されている。
 */
export class UpdateSalesStageDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sortOrder?: number;
}
