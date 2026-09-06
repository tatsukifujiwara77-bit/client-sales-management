import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller.js';
import { ActivitiesGlobalController } from './activities-global.controller.js';
import { ActivitiesService } from './activities.service.js';
import { AlertsModule } from '../alerts/alerts.module.js';

@Module({
  imports: [AlertsModule],
  controllers: [ActivitiesController, ActivitiesGlobalController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
