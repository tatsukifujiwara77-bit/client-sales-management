import {
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export const TEMPERATURES = ['high', 'medium', 'low', 'unknown'] as const;
export type Temperature = (typeof TEMPERATURES)[number];

/**
 * clients の作成用DTO。
 *
 * 意図的に含めていないもの:
 * - last_visited_at / last_activity_at: activities から集計するキャッシュ列。
 *   クライアントが直接書き込める項目ではない（STEP9で活動登録時に更新する）。
 * - id / created_at / updated_at / created_by / updated_by: サーバー側で決定する。
 */
export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  companyName!: string;

  @IsUUID()
  officeId!: string;

  @IsUUID()
  salesStageId!: string;

  @IsOptional()
  @IsIn(TEMPERATURES)
  temperature?: Temperature;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @IsLongitude()
  lng?: number;

  @IsOptional()
  @IsString()
  characteristics?: string;

  @IsOptional()
  @IsString()
  cautionNotes?: string;

  /** 開拓者。省略時はリクエストを行った本人になる。 */
  @IsOptional()
  @IsUUID()
  discoveredBy?: string;

  @IsOptional()
  @IsUUID()
  lossReasonId?: string;
}
