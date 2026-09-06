import { PartialType } from '@nestjs/mapped-types';
import { CreateClientContactDto } from './create-client-contact.dto.js';

export class UpdateClientContactDto extends PartialType(CreateClientContactDto) {}
