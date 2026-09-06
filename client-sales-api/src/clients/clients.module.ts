import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller.js';
import { ClientsService } from './clients.service.js';
import { ClientContactsModule } from '../client-contacts/client-contacts.module.js';
import { ClientNotesModule } from '../client-notes/client-notes.module.js';
import { ActivitiesModule } from '../activities/activities.module.js';
import { ActionItemsModule } from '../action-items/action-items.module.js';

@Module({
  imports: [ClientContactsModule, ClientNotesModule, ActivitiesModule, ActionItemsModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
