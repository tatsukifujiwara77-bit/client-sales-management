export interface ClientNoteAttachment {
  id: string;
  noteId: string;
  clientId: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  createdBy: string | null;
}

export interface RawClientNoteAttachmentRow {
  id: string;
  note_id: string;
  client_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  created_by: string | null;
}

/**
 * storage_path はサーバー内部でのみ扱う（ダウンロード時に署名付きURLへ変換するため）。
 * フロントエンドへは公開しない。
 */
export function mapClientNoteAttachmentRow(row: RawClientNoteAttachmentRow): ClientNoteAttachment {
  return {
    id: row.id,
    noteId: row.note_id,
    clientId: row.client_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}
