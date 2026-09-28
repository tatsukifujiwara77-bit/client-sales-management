import { Module } from '@nestjs/common';
import { IndustriesController } from './industries.controller.js';
import { IndustriesService } from './industries.service.js';

@Module({
  controllers: [IndustriesController],
  providers: [IndustriesService],
  exports: [IndustriesService],
})
export class IndustriesModule {}
