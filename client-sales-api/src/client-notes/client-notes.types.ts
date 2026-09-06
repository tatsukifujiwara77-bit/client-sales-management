export interface ClientNote {
  id: string;
  clientId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface RawClientNoteRow {
  id: string;
  client_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export function mapClientNoteRow(row: RawClientNoteRow): ClientNote {
  return {
    id: row.id,
    clientId: row.client_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}
