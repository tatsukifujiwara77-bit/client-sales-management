import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { AlertSettingsService } from './alert-settings.service.js';
import { UpdateAlertSettingDto } from './dto/update-alert-setting.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

@Controller('alert-settings')
export class AlertSettingsController {
  constructor(private readonly alertSettingsService: AlertSettingsService) {}

  @Get()
  list() {
    return this.alertSettingsService.list();
  }

  @Patch(':key')
  update(@Param('key') key: string, @Body() dto: UpdateAlertSettingDto, @CurrentUser() user: AuthUser) {
    return this.alertSettingsService.update(key, dto.value, user);
  }
}
