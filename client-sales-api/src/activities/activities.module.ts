import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller.js';
import { ActivitiesGlobalController } from './activities-global.controller.js';
import { ActivitiesService } from './activities.service.js';
import { ClientActivityCacheModule } from '../common/client-activity-cache/client-activity-cache.module.js';

@Module({
  imports: [ClientActivityCacheModule],
  controllers: [ActivitiesController, ActivitiesGlobalController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
