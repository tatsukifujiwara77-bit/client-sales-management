import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { AlertsService } from './alerts.service.js';
import { ListAlertsQueryDto } from './dto/list-alerts-query.dto.js';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  /** ダッシュボード用: 件数サマリー＋一覧（設計書 7.2） */
  @Get()
  getDashboard(@Query() query: ListAlertsQueryDto) {
    return this.alertsService.getDashboard(query);
  }

  @Patch(':id')
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAlertStatusDto) {
    return this.alertsService.updateStatus(id, dto.status);
  }

  /**
   * アラートの再計算バッチ（service_role使用、RLSを完全にバイパスするため管理者限定）。
   * RLSでは判定できない操作のため、ここでのみ明示的にロールチェックを行う
   * （通常のリソースアクセス可否はRLSに委ねる、という方針の例外）。
   */
  @Post('recompute')
  recomputeAll(@CurrentUser() user: AuthUser) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can trigger alert recomputation.');
    }
    return this.alertsService.recomputeAll();
  }
}
