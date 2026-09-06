import { Module } from '@nestjs/common';
import { ClientNotesController } from './client-notes.controller.js';
import { ClientNotesService } from './client-notes.service.js';

@Module({
  controllers: [ClientNotesController],
  providers: [ClientNotesService],
  exports: [ClientNotesService],
})
export class ClientNotesModule {}
