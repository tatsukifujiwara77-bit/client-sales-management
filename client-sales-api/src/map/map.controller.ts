import { Controller, Get, Query } from '@nestjs/common';
import { MapService } from './map.service.js';
import { MapClientsQueryDto } from './dto/map-clients-query.dto.js';

@Controller('map')
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get('clients')
  getMapClients(@Query() query: MapClientsQueryDto) {
    return this.mapService.getMapClients(query);
  }
}
