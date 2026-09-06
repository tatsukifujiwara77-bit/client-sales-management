import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ALERT_STATUSES, ALERT_TYPES, type AlertStatus, type AlertType } from '../alerts.types.js';

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
