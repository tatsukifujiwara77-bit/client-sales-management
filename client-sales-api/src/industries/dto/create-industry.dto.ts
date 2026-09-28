import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateIndustryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  /** 省略時は末尾に追加する（サービス側で現在の最大sort_order+1を採番） */
  @IsOptional()
  @IsInt()
  @Min(1)
  sortOrder?: number;
}
