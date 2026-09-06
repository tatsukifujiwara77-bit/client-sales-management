import { IsIn } from 'class-validator';
import { ALERT_STATUSES, type AlertStatus } from '../alerts.types.js';

/** PATCH /alerts/:id （既読・却下・解決の切り替え） */
export class UpdateAlertStatusDto {
  @IsIn(ALERT_STATUSES)
  status!: AlertStatus;
}
