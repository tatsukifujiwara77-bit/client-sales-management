import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsLatitude, IsLongitude, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { TEMPERATURES, type Temperature } from '../../clients/dto/create-client.dto.js';

/**
 * GET /map/clients のクエリパラメータ（設計書 11.4「エリア別クライアントマップ」）。
 * swLat/swLng/neLat/neLng は表示中の地図の範囲（南西端・北東端）。
 * 4つすべて指定した場合のみ範囲で絞り込み、一部だけの指定は不正とする。
 */
export class MapClientsQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsLatitude()
  swLat?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsLongitude()
  swLng?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsLatitude()
  neLat?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsLongitude()
  neLng?: number;

  @IsOptional()
  @IsUUID()
  officeId?: string;

  @IsOptional()
  @IsIn(TEMPERATURES)
  temperature?: Temperature;

  @IsOptional()
  @IsUUID()
  salesStageId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 500;
}
