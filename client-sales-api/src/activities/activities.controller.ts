import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ActivitiesService } from './activities.service.js';
import { CreateActivityDto } from './dto/create-activity.dto.js';
import { UpdateActivityDto } from './dto/update-activity.dto.js';
import { ListActivitiesQueryDto } from './dto/list-activities-query.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

@Controller('clients/:clientId/activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  list(@Param('clientId', ParseUUIDPipe) clientId: string, @Query() query: ListActivitiesQueryDto) {
    return this.activitiesService.list(clientId, query);
  }

  @Get(':activityId')
  findOne(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
  ) {
    return this.activitiesService.findOne(clientId, activityId);
  }

  @Post()
  create(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: CreateActivityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.activitiesService.create(clientId, dto, user);
  }

  @Patch(':activityId')
  update(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() dto: UpdateActivityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.activitiesService.update(clientId, activityId, dto, user);
  }

  @Delete(':activityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
  ) {
    return this.activitiesService.remove(clientId, activityId);
  }
}
