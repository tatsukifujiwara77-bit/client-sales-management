import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ALERT_STATUSES, ALERT_TYPES, type AlertStatus, type AlertType } from '../alerts.types.js';

const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  return value;
};

/** GET /alerts, GET /clients/:clientId/alerts のクエリパラメータ */
export class ListAlertsQueryDto {
  @IsOptional()
  @IsIn(ALERT_TYPES)
  alertType?: AlertType;

  @IsOptional()
  @IsIn(ALERT_STATUSES)
  status?: AlertStatus = 'open';

  @IsOptional()
  @IsUUID()
  officeId?: string;

  /**
   * trueの場合のみ、閲覧前にアラートを再計算する(明示的にopt-inしたときだけ)。
   * サイドバー/ヘッダーのバッジ件数取得(全ページ共通レイアウトから毎回呼ばれる)まで
   * 再計算対象にすると、ページ遷移のたびに全クライアント分の再計算が走り重くなるため、
   * 実際にアラート内容を確認する画面(アラート一覧・クライアント詳細のアラートタブ)
   * からのリクエストだけがこのフラグを付けて呼び出す。
   */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  refresh?: boolean;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number = 50;
}
