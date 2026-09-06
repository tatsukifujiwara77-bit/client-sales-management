import { Module } from '@nestjs/common';
import { AlertSettingsController } from './alert-settings.controller.js';
import { AlertSettingsService } from './alert-settings.service.js';

@Module({
  controllers: [AlertSettingsController],
  providers: [AlertSettingsService],
})
export class AlertSettingsModule {}
