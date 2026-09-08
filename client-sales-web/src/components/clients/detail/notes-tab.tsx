'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, NotebookPen, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NoteAttachments } from './note-attachments';
import { clientFetchApi } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { CLIENT_NOTE_TEMPLATE } from '@/lib/note-template';
import { NOTE_MEETING_TYPE_LABELS, formatDateSlash } from '@/lib/domain-labels';
import type { ClientNote, NoteMeetingType } from '@/lib/api/types';

const MEETING_TYPES: NoteMeetingType[] = ['visit', 'online'];
const MEETING_TYPE_ITEMS = MEETING_TYPES.map((type) => ({ value: type, label: NOTE_MEETING_TYPE_LABELS[type] }));

/** 商談メモの「実施形式・参加者」入力欄（新規作成・編集の両方で使い回す）。 */
function MeetingFields({
  meetingType,
  onMeetingTypeChange,
  participantsOwn,
  onParticipantsOwnChange,
  participantsClient,
  onParticipantsClientChange,
  idPrefix,
}: {
  meetingType: NoteMeetingType;
  onMeetingTypeChange: (value: NoteMeetingType) => void;
  participantsOwn: string;
  onParticipantsOwnChange: (value: string) => void;
  participantsClient: string;
  onParticipantsClientChange: (value: string) => void;
  idPrefix: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <div className="flex flex-col gap-1.5">
        <Label>実施形式</Label>
        <Select
          items={MEETING_TYPE_ITEMS}
          value={meetingType}
          onValueChange={(v) => onMeetingTypeChange((v as NoteMeetingType) ?? 'visit')}
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEETING_TYPE_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-participants-own`}>参加者(当社)</Label>
        <Input
          id={`${idPrefix}-participants-own`}
          value={participantsOwn}
          onChange={(e) => onParticipantsOwnChange(e.target.value)}
          placeholder="例: 藤原"
          className="sm:w-48"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-participants-client`}>参加者(先方)</Label>
        <Input
          id={`${idPrefix}-participants-client`}
          value={participantsClient}
          onChange={(e) => onParticipantsClientChange(e.target.value)}
          placeholder="例: 髙江洲様"
          className="sm:w-48"
        />
      </div>
    </div>
  );
}

function NoteCard({ clientId, note }: { clientId: string; note: ClientNote }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [meetingType, setMeetingType] = useState<NoteMeetingType>(note.meetingType ?? 'visit');
  const [participantsOwn, setParticipantsOwn] = useState(note.participantsOwn ?? '');
  const [participantsClient, setParticipantsClient] = useState(note.participantsClient ?? '');
  const [content, setContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSave() {
    if (!content.trim()) {
      toast.error('内容を入力してください');
      return;
    }
    setIsSaving(true);
    try {
      await clientFetchApi(`/clients/${clientId}/notes/${note.id}`, {
        method: 'PATCH',
        body: {
          meetingType,
          participantsOwn: participantsOwn || undefined,
          participantsClient: participantsClient || undefined,
          content,
        },
      });
      toast.success('商談メモを更新しました');
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('この商談メモを削除しますか？添付ファイルも合わせて削除され、この操作は取り消せません。')) {
      return;
    }
    setIsDeleting(true);
    try {
      await clientFetchApi(`/clients/${clientId}/notes/${note.id}`, { method: 'DELETE' });
      toast.success('商談メモを削除しました');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '削除に失敗しました');
      setIsDeleting(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-muted-foreground">{formatDateSlash(note.updatedAt.slice(0, 10))} 更新</p>
          {!isEditing ? (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => {
                  setMeetingType(note.meetingType ?? 'visit');
                  setParticipantsOwn(note.participantsOwn ?? '');
                  setParticipantsClient(note.participantsClient ?? '');
                  setContent(note.content);
                  setIsEditing(true);
                }}
                aria-label="編集"
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive"
                aria-label="削除"
              >
                {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              </Button>
            </div>
          ) : null}
        </div>

        {isEditing ? (
          <>
            <MeetingFields
              idPrefix={note.id}
              meetingType={meetingType}
              onMeetingTypeChange={setMeetingType}
              participantsOwn={participantsOwn}
              onParticipantsOwnChange={setParticipantsOwn}
              participantsClient={participantsClient}
              onParticipantsClientChange={setParticipantsClient}
            />
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              className="font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                <X className="size-3.5" />
                キャンセル
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                保存
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {note.meetingType ? (
                <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
                  {NOTE_MEETING_TYPE_LABELS[note.meetingType]}
                </span>
              ) : null}
              {note.participantsOwn || note.participantsClient ? (
                <span>
                  参加者(当社): {note.participantsOwn || '未入力'} ・ 参加者(先方): {note.participantsClient || '未入力'}
                </span>
              ) : null}
            </div>
            <p className="text-sm whitespace-pre-wrap text-foreground">{note.content}</p>
          </>
        )}

        <NoteAttachments clientId={clientId} noteId={note.id} />
      </CardContent>
    </Card>
  );
}

function NewNoteForm({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const router = useRouter();
  const [meetingType, setMeetingType] = useState<NoteMeetingType>('visit');
  const [participantsOwn, setParticipantsOwn] = useState('');
  const [participantsClient, setParticipantsClient] = useState('');
  const [content, setContent] = useState(CLIENT_NOTE_TEMPLATE);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!content.trim()) {
      toast.error('内容を入力してください');
      return;
    }
    setIsSaving(true);
    try {
      await clientFetchApi(`/clients/${clientId}/notes`, {
        method: 'POST',
        body: {
          meetingType,
          participantsOwn: participantsOwn || undefined,
          participantsClient: participantsClient || undefined,
          content,
        },
      });
      toast.success('商談メモを登録しました');
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '登録に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="border-dashed">
      <CardContent className="space-y-3 py-4">
        <MeetingFields
          idPrefix="new-note"
          meetingType={meetingType}
          onMeetingTypeChange={setMeetingType}
          participantsOwn={participantsOwn}
          onParticipantsOwnChange={setParticipantsOwn}
          participantsClient={participantsClient}
          onParticipantsClientChange={setParticipantsClient}
        />
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          className="font-mono text-sm"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onClose} disabled={isSaving}>
            キャンセル
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            登録する
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 商談メモタブ。クライアントとの商談内容を都度記録する（訪問／オンラインの別、
 * 参加者(当社/先方)を記録できる）。新規作成時は商談記録用の定型テンプレート
 * (CLIENT_NOTE_TEMPLATE)を自動入力し、そのまま編集して保存できるようにする。
 * 各メモにはファイルを添付できる(NoteAttachments)。
 */
export function NotesTab({ clientId, notes }: { clientId: string; notes: ClientNote[] }) {
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!isCreating ? (
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <Plus className="size-4" />
            商談メモを追加
          </Button>
        ) : null}
      </div>

      {isCreating ? <NewNoteForm clientId={clientId} onClose={() => setIsCreating(false)} /> : null}

      {notes.length === 0 && !isCreating ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <NotebookPen className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">まだ商談メモはありません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteCard key={note.id} clientId={clientId} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
