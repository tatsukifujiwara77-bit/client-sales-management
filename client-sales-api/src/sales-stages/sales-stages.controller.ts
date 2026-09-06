import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { SalesStagesService } from './sales-stages.service.js';
import { UpdateSalesStageDto } from './dto/update-sales-stage.dto.js';

@Controller('sales-stages')
export class SalesStagesController {
  constructor(private readonly salesStagesService: SalesStagesService) {}

  @Get()
  list() {
    return this.salesStagesService.list();
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSalesStageDto) {
    return this.salesStagesService.update(id, dto);
  }
}
