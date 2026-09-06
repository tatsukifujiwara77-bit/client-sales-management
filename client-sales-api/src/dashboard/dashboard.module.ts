import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { ClientsModule } from '../clients/clients.module.js';
import { ActivitiesModule } from '../activities/activities.module.js';
import { ActionItemsModule } from '../action-items/action-items.module.js';
import { AlertsModule } from '../alerts/alerts.module.js';

@Module({
  imports: [ClientsModule, ActivitiesModule, ActionItemsModule, AlertsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
