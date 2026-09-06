import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { AlertsService } from './alerts.service.js';
import { ListAlertsQueryDto } from './dto/list-alerts-query.dto.js';

/** クライアント詳細画面の「アラート」タブ（設計書 11.4）用 */
@Controller('clients/:clientId/alerts')
export class ClientAlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  getDashboard(@Param('clientId', ParseUUIDPipe) clientId: string, @Query() query: ListAlertsQueryDto) {
    return this.alertsService.getDashboard(query, clientId);
  }
}
