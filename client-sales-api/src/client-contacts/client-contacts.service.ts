import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import { throwIfSupabaseError } from '../common/supabase/supabase-error.util.js';
import type { AuthUser } from '../common/types/authenticated-request.js';
import type { CreateClientContactDto } from './dto/create-client-contact.dto.js';
import type { UpdateClientContactDto } from './dto/update-client-contact.dto.js';
import { mapClientContactRow, type ClientContact, type RawClientContactRow } from './client-contacts.types.js';

const COLUMNS =
  'id, client_id, name, position, department, phone, email, is_key_person, notes, created_at, updated_at';

@Injectable()
export class ClientContactsService {
  constructor(private readonly supabaseRequestService: SupabaseRequestService) {}

  async list(clientId: string): Promise<ClientContact[]> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('client_contacts')
      .select(COLUMNS)
      .eq('client_id', clientId)
      // 重要人物を先頭に、その後は登録日時順
      .order('is_key_person', { ascending: false })
      .order('created_at', { ascending: true });

    throwIfSupabaseError(error, { entityName: 'Client contact' });
    return ((data ?? []) as unknown as RawClientContactRow[]).map(mapClientContactRow);
  }

  async create(
    clientId: string,
    dto: CreateClientContactDto,
    currentUser: AuthUser,
  ): Promise<ClientContact> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('client_contacts')
      .insert({
        client_id: clientId,
        name: dto.name,
        position: dto.position,
        department: dto.department,
        phone: dto.phone,
        email: dto.email,
        is_key_person: dto.isKeyPerson ?? false,
        notes: dto.notes,
        created_by: currentUser.id,
        updated_by: currentUser.id,
      })
      .select(COLUMNS)
      .single();

    throwIfSupabaseError(error, { entityName: 'Client contact' });
    return mapClientContactRow(data as unknown as RawClientContactRow);
  }

  async update(
    clientId: string,
    contactId: string,
    dto: UpdateClientContactDto,
    currentUser: AuthUser,
  ): Promise<ClientContact> {
    const client = this.supabaseRequestService.getClient();

    const updateRow: Record<string, unknown> = { updated_by: currentUser.id };
    if (dto.name !== undefined) updateRow.name = dto.name;
    if (dto.position !== undefined) updateRow.position = dto.position;
    if (dto.department !== undefined) updateRow.department = dto.department;
    if (dto.phone !== undefined) updateRow.phone = dto.phone;
    if (dto.email !== undefined) updateRow.email = dto.email;
    if (dto.isKeyPerson !== undefined) updateRow.is_key_person = dto.isKeyPerson;
    if (dto.notes !== undefined) updateRow.notes = dto.notes;

    const { data, error } = await client
      .from('client_contacts')
      .update(updateRow)
      .eq('id', contactId)
      .eq('client_id', clientId)
      .select(COLUMNS)
      .maybeSingle();

    throwIfSupabaseError(error, { entityName: 'Client contact' });
    if (!data) {
      throw new NotFoundException('Client contact not found.');
    }
    return mapClientContactRow(data as unknown as RawClientContactRow);
  }

  async remove(clientId: string, contactId: string): Promise<void> {
    const client = this.supabaseRequestService.getClient();
    const { error } = await client
      .from('client_contacts')
      .delete()
      .eq('id', contactId)
      .eq('client_id', clientId);

    throwIfSupabaseError(error, { entityName: 'Client contact' });
  }
}
