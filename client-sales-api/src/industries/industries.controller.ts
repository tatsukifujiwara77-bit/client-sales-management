import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { IndustriesService } from './industries.service.js';
import { CreateIndustryDto } from './dto/create-industry.dto.js';
import { UpdateIndustryDto } from './dto/update-industry.dto.js';

@Controller('industries')
export class IndustriesController {
  constructor(private readonly industriesService: IndustriesService) {}

  @Get()
  list() {
    return this.industriesService.list();
  }

  @Post()
  create(@Body() dto: CreateIndustryDto) {
    return this.industriesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateIndustryDto) {
    return this.industriesService.update(id, dto);
  }

  /**
   * 業種の削除（RLS: industries_write_adminによりadmin限定）。
   * client_industries.industry_id は ON DELETE RESTRICT のため、
   * 使用中の業種は削除できない（serviceでConflictExceptionに変換）。
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.industriesService.remove(id);
  }
}
