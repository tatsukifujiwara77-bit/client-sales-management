import { Module } from '@nestjs/common';
import { ClientContactsController } from './client-contacts.controller.js';
import { ClientContactsService } from './client-contacts.service.js';

@Module({
  controllers: [ClientContactsController],
  providers: [ClientContactsService],
  exports: [ClientContactsService],
})
export class ClientContactsModule {}
