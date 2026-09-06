import { Module } from '@nestjs/common';
import { ActionItemsController } from './action-items.controller.js';
import { ActionItemsService } from './action-items.service.js';
import { ActivitiesModule } from '../activities/activities.module.js';
import { AlertsModule } from '../alerts/alerts.module.js';

@Module({
  imports: [ActivitiesModule, AlertsModule],
  controllers: [ActionItemsController],
  providers: [ActionItemsService],
  exports: [ActionItemsService],
})
export class ActionItemsModule {}
