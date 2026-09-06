import { Controller, Get, Query } from '@nestjs/common';
import { ActivitiesService } from './activities.service.js';
import { ListActivitiesAcrossClientsQueryDto } from './dto/list-activities-across-clients-query.dto.js';

/**
 * クライアントを横断した営業活動一覧（設計書 11.4「営業活動タイムライン」）。
 * 個別クライアント配下の /clients/:clientId/activities（ActivitiesController）とは
 * ルートが独立しているため別コントローラにしている。
 */
@Controller('activities')
export class ActivitiesGlobalController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  list(@Query() query: ListActivitiesAcrossClientsQueryDto) {
    return this.activitiesService.listAcrossClients(query);
  }
}
