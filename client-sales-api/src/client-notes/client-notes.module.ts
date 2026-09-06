import { Module } from '@nestjs/common';
import { ClientNotesController } from './client-notes.controller.js';
import { ClientNotesService } from './client-notes.service.js';
import { ClientNoteAttachmentsController } from './client-note-attachments.controller.js';
import { ClientNoteAttachmentsService } from './client-note-attachments.service.js';

@Module({
  controllers: [ClientNotesController, ClientNoteAttachmentsController],
  providers: [ClientNotesService, ClientNoteAttachmentsService],
  exports: [ClientNotesService, ClientNoteAttachmentsService],
})
export class ClientNotesModule {}
