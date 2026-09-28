import {
  IsArray,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
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

  /** ホームページURL。https://等のプロトコル省略も許容する（例: example.co.jp） */
  @IsOptional()
  @IsUrl({ require_protocol: false })
  @MaxLength(500)
  websiteUrl?: string;

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

  /** ビル名・階数等。地図表示時は所在地(address)と連結して表示する（ジオコーディングにはaddressのみを使う） */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  buildingName?: string;

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

  /** 業種（複数可）。空配列を送ると全て解除する。未指定(キー自体が無い)場合は既存の業種を変更しない */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  industryIds?: string[];

  /** 主業種。省略時は industryIds が1件ならそれを、複数なら先頭を主業種として扱う */
  @IsOptional()
  @IsUUID()
  primaryIndustryId?: string;
}
