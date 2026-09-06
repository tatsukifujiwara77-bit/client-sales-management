import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
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

  /**
   * フェーズの削除（RLS: sales_stages_write_adminによりadmin限定）。
   * clients.sales_stage_id は ON DELETE 未指定（NO ACTION）のため、
   * 該当フェーズを使用しているクライアントが1件でもあれば削除できない
   * （service側で分かりやすいエラーメッセージに変換する）。
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesStagesService.remove(id);
  }
}
