import type { MeetingType } from './dto/create-client-note.dto.js';

export type { MeetingType };

export interface ClientNote {
  id: string;
  clientId: string;
  /** 商談の実施形式（訪問／オンライン）。項目追加前の既存メモにはnullが入る。 */
  meetingType: MeetingType | null;
  /** 参加者(当社) */
  participantsOwn: string | null;
  /** 参加者(先方) */
  participantsClient: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface RawClientNoteRow {
  id: string;
  client_id: string;
  meeting_type: MeetingType | null;
  participants_own: string | null;
  participants_client: string | null;
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
    meetingType: row.meeting_type,
    participantsOwn: row.participants_own,
    participantsClient: row.participants_client,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}
