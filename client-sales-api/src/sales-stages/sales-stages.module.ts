import { Module } from '@nestjs/common';
import { SalesStagesController } from './sales-stages.controller.js';
import { SalesStagesService } from './sales-stages.service.js';

@Module({
  controllers: [SalesStagesController],
  providers: [SalesStagesService],
})
export class SalesStagesModule {}
