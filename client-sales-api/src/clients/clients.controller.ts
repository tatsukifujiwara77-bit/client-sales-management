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
import { ClientsService } from './clients.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';
import { ListClientsQueryDto } from './dto/list-clients-query.dto.js';
import { AssignClientDto } from './dto/assign-client.dto.js';
import { PipelineQueryDto } from './dto/pipeline-query.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  list(@Query() query: ListClientsQueryDto) {
    return this.clientsService.list(query);
  }

  /**
   * 営業進捗パイプライン（Kanban表示用）。
   * ':id' ルートとの誤マッチを避けるため、必ずそれより前に定義する。
   */
  @Get('pipeline')
  getPipeline(@Query() query: PipelineQueryDto) {
    return this.clientsService.getPipeline(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientsService.findOne(id);
  }

  /** クライアントカルテ（会社情報・担当者・重要人物・常設メモ・直近活動・次回アクションの集約ビュー） */
  @Get(':id/dossier')
  getDossier(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientsService.getDossier(id);
  }

  @Post()
  create(@Body() dto: CreateClientDto, @CurrentUser() user: AuthUser) {
    return this.clientsService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clientsService.update(id, dto, user);
  }

  @Get(':id/assignments')
  listAssignments(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientsService.listAssignments(id);
  }

  @Post(':id/assignments')
  assign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignClientDto) {
    return this.clientsService.assign(id, dto);
  }

  @Delete(':id/assignments/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unassign(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.clientsService.unassign(id, userId);
  }
}
