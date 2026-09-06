import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller.js';
import { ClientAlertsController } from './client-alerts.controller.js';
import { AlertsService } from './alerts.service.js';

@Module({
  controllers: [AlertsController, ClientAlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
