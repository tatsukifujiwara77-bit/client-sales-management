import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseRequestService } from '../supabase/supabase-request.service.js';
import { throwIfSupabaseError } from '../common/supabase/supabase-error.util.js';
import type { AuthUser } from '../common/types/authenticated-request.js';
import {
  mapClientNoteAttachmentRow,
  type ClientNoteAttachment,
  type RawClientNoteAttachmentRow,
} from './client-note-attachments.types.js';

const BUCKET = 'client-attachments';
const COLUMNS = 'id, note_id, client_id, storage_path, file_name, mime_type, size_bytes, created_at, created_by';

export const MAX_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

/** 許可するファイル形式（業務でよく使う書類・画像・圧縮ファイルに限定する） */
export const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/zip',
]);

@Injectable()
export class ClientNoteAttachmentsService {
  private readonly logger = new Logger(ClientNoteAttachmentsService.name);

  constructor(private readonly supabaseRequestService: SupabaseRequestService) {}

  async list(clientId: string, noteId: string): Promise<ClientNoteAttachment[]> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('client_note_attachments')
      .select(COLUMNS)
      .eq('client_id', clientId)
      .eq('note_id', noteId)
      .order('created_at', { ascending: false });

    throwIfSupabaseError(error, { entityName: 'Attachment' });
    return ((data ?? []) as unknown as RawClientNoteAttachmentRow[]).map(mapClientNoteAttachmentRow);
  }

  async upload(
    clientId: string,
    noteId: string,
    file: Express.Multer.File,
    currentUser: AuthUser,
  ): Promise<ClientNoteAttachment> {
    const client = this.supabaseRequestService.getClient();

    await this.assertNoteBelongsToClient(clientId, noteId);

    const sanitizedFileName = file.originalname.replaceAll(/[^\w.\-ぁ-んァ-ヶ一-龠ー ]/g, '_');
    const storagePath = `${clientId}/${noteId}/${randomUUID()}-${sanitizedFileName}`;

    const { error: uploadError } = await client.storage
      .from(BUCKET)
      .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });

    if (uploadError) {
      this.logger.error(`Failed to upload attachment to storage: ${uploadError.message}`);
      throw new BadRequestException('ファイルのアップロードに失敗しました。');
    }

    const { data, error } = await client
      .from('client_note_attachments')
      .insert({
        note_id: noteId,
        client_id: clientId,
        storage_path: storagePath,
        file_name: file.originalname,
        mime_type: file.mimetype,
        size_bytes: file.size,
        created_by: currentUser.id,
      })
      .select(COLUMNS)
      .single();

    if (error) {
      // メタデータ登録に失敗した場合、孤立したファイルが残らないよう可能な範囲で片付ける
      await client.storage.from(BUCKET).remove([storagePath]);
    }
    throwIfSupabaseError(error, { entityName: 'Attachment' });
    return mapClientNoteAttachmentRow(data as unknown as RawClientNoteAttachmentRow);
  }

  async getDownloadUrl(clientId: string, noteId: string, attachmentId: string): Promise<string> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('client_note_attachments')
      .select('storage_path')
      .eq('id', attachmentId)
      .eq('client_id', clientId)
      .eq('note_id', noteId)
      .maybeSingle();

    throwIfSupabaseError(error, { entityName: 'Attachment' });
    if (!data) {
      throw new NotFoundException('Attachment not found.');
    }

    const { data: signed, error: signError } = await client.storage
      .from(BUCKET)
      .createSignedUrl((data as { storage_path: string }).storage_path, 300);

    if (signError || !signed) {
      this.logger.error(`Failed to create a signed URL: ${signError?.message}`);
      throw new BadRequestException('ファイルのダウンロードURLを発行できませんでした。');
    }
    return signed.signedUrl;
  }

  async remove(clientId: string, noteId: string, attachmentId: string): Promise<void> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('client_note_attachments')
      .select('storage_path')
      .eq('id', attachmentId)
      .eq('client_id', clientId)
      .eq('note_id', noteId)
      .maybeSingle();

    throwIfSupabaseError(error, { entityName: 'Attachment' });
    if (!data) {
      throw new NotFoundException('Attachment not found.');
    }

    // メタデータ行を先に消す（＝ダウンロード経路を先に断つ）。
    // ストレージの実ファイル削除が後で失敗しても、孤立ファイルが残るだけで実害はない。
    const { error: deleteRowError } = await client.from('client_note_attachments').delete().eq('id', attachmentId);
    throwIfSupabaseError(deleteRowError, { entityName: 'Attachment' });

    const { error: removeError } = await client.storage
      .from(BUCKET)
      .remove([(data as { storage_path: string }).storage_path]);
    if (removeError) {
      this.logger.error(`Failed to remove attachment from storage: ${removeError.message}`);
    }
  }

  private async assertNoteBelongsToClient(clientId: string, noteId: string): Promise<void> {
    const client = this.supabaseRequestService.getClient();
    const { data, error } = await client
      .from('client_notes')
      .select('id')
      .eq('id', noteId)
      .eq('client_id', clientId)
      .maybeSingle();

    throwIfSupabaseError(error, { entityName: 'Client note' });
    if (!data) {
      throw new NotFoundException('Client note not found.');
    }
  }
}
