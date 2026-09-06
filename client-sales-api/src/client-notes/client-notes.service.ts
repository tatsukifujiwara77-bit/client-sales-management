import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import { throwIfSupabaseError } from '../common/supabase/supabase-error.util.js';
import type { AuthUser } from '../common/types/authenticated-request.js';
import type { CreateClientNoteDto } from './dto/create-client-note.dto.js';
import type { UpdateClientNoteDto } from './dto/update-client-note.dto.js';
import { mapClientNoteRow, type ClientNote, type RawClientNoteRow } from './client-notes.types.js';

const COLUMNS = 'id, client_id, content, created_at, updated_at, created_by, updated_by';

@Injectable()
export class ClientNotesService {
  constructor(private readonly supabaseRequestService: SupabaseRequestService) {}

  async list(clientId: string): Promise<ClientNote[]> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('client_notes')
      .select(COLUMNS)
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false });

    throwIfSupabaseError(error, { entityName: 'Client note' });
    return ((data ?? []) as unknown as RawClientNoteRow[]).map(mapClientNoteRow);
  }

  /** カルテ画面などで「直近の常設メモ」だけ軽く取得したい場合に使う */
  async findLatest(clientId: string): Promise<ClientNote | null> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('client_notes')
      .select(COLUMNS)
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    throwIfSupabaseError(error, { entityName: 'Client note' });
    return data ? mapClientNoteRow(data as unknown as RawClientNoteRow) : null;
  }

  async create(clientId: string, dto: CreateClientNoteDto, currentUser: AuthUser): Promise<ClientNote> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('client_notes')
      .insert({
        client_id: clientId,
        content: dto.content,
        created_by: currentUser.id,
        updated_by: currentUser.id,
      })
      .select(COLUMNS)
      .single();

    throwIfSupabaseError(error, { entityName: 'Client note' });
    return mapClientNoteRow(data as unknown as RawClientNoteRow);
  }

  async update(
    clientId: string,
    noteId: string,
    dto: UpdateClientNoteDto,
    currentUser: AuthUser,
  ): Promise<ClientNote> {
    const client = this.supabaseRequestService.getClient();
    const updateRow: Record<string, unknown> = { updated_by: currentUser.id };
    if (dto.content !== undefined) updateRow.content = dto.content;

    const { data, error } = await client
      .from('client_notes')
      .update(updateRow)
      .eq('id', noteId)
      .eq('client_id', clientId)
      .select(COLUMNS)
      .maybeSingle();

    throwIfSupabaseError(error, { entityName: 'Client note' });
    if (!data) {
      throw new NotFoundException('Client note not found.');
    }
    return mapClientNoteRow(data as unknown as RawClientNoteRow);
  }

  async remove(clientId: string, noteId: string): Promise<void> {
    const client = this.supabaseRequestService.getClient();
    const { error } = await client.from('client_notes').delete().eq('id', noteId).eq('client_id', clientId);

    throwIfSupabaseError(error, { entityName: 'Client note' });
  }
}
