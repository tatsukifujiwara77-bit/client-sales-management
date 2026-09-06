import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ClientNotesService } from './client-notes.service.js';
import { CreateClientNoteDto } from './dto/create-client-note.dto.js';
import { UpdateClientNoteDto } from './dto/update-client-note.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

@Controller('clients/:clientId/notes')
export class ClientNotesController {
  constructor(private readonly clientNotesService: ClientNotesService) {}

  @Get()
  list(@Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.clientNotesService.list(clientId);
  }

  @Post()
  create(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: CreateClientNoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clientNotesService.create(clientId, dto, user);
  }

  @Patch(':noteId')
  update(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body() dto: UpdateClientNoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clientNotesService.update(clientId, noteId, dto, user);
  }

  @Delete(':noteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ) {
    return this.clientNotesService.remove(clientId, noteId);
  }
}
