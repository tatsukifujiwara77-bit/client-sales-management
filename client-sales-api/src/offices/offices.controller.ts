import { Controller, Get } from '@nestjs/common';
import { OfficesService } from './offices.service.js';

@Controller('offices')
export class OfficesController {
  constructor(private readonly officesService: OfficesService) {}

  @Get()
  list() {
    return this.officesService.list();
  }
}
