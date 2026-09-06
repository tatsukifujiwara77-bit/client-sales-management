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
import { ActionItemsService } from './action-items.service.js';
import { CreateActionItemDto } from './dto/create-action-item.dto.js';
import { UpdateActionItemDto } from './dto/update-action-item.dto.js';
import { ListActionItemsQueryDto } from './dto/list-action-items-query.dto.js';
import { CompleteActionItemDto } from './dto/complete-action-item.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

@Controller('clients/:clientId/action-items')
export class ActionItemsController {
  constructor(private readonly actionItemsService: ActionItemsService) {}

  @Get()
  list(@Param('clientId', ParseUUIDPipe) clientId: string, @Query() query: ListActionItemsQueryDto) {
    return this.actionItemsService.list(clientId, query);
  }

  @Get(':actionItemId')
  findOne(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('actionItemId', ParseUUIDPipe) actionItemId: string,
  ) {
    return this.actionItemsService.findOne(clientId, actionItemId);
  }

  @Post()
  create(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: CreateActionItemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.actionItemsService.create(clientId, dto, user);
  }

  @Patch(':actionItemId')
  update(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('actionItemId', ParseUUIDPipe) actionItemId: string,
    @Body() dto: UpdateActionItemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.actionItemsService.update(clientId, actionItemId, dto, user);
  }

  /** 対応済みにする（任意で活動記録・次回アクションを同時に作成） */
  @Post(':actionItemId/complete')
  complete(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('actionItemId', ParseUUIDPipe) actionItemId: string,
    @Body() dto: CompleteActionItemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.actionItemsService.complete(clientId, actionItemId, dto, user);
  }

  @Delete(':actionItemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('actionItemId', ParseUUIDPipe) actionItemId: string,
  ) {
    return this.actionItemsService.remove(clientId, actionItemId);
  }
}
