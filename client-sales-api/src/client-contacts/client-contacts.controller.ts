import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ClientContactsService } from './client-contacts.service.js';
import { CreateClientContactDto } from './dto/create-client-contact.dto.js';
import { UpdateClientContactDto } from './dto/update-client-contact.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/authenticated-request.js';

@Controller('clients/:clientId/contacts')
export class ClientContactsController {
  constructor(private readonly clientContactsService: ClientContactsService) {}

  @Get()
  list(@Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.clientContactsService.list(clientId);
  }

  @Post()
  create(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: CreateClientContactDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clientContactsService.create(clientId, dto, user);
  }

  @Patch(':contactId')
  update(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: UpdateClientContactDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clientContactsService.update(clientId, contactId, dto, user);
  }

  @Delete(':contactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.clientContactsService.remove(clientId, contactId);
  }
}
