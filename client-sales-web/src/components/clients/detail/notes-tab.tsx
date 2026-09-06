'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, NotebookPen, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { NoteAttachments } from './note-attachments';
import { clientFetchApi } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { CLIENT_NOTE_TEMPLATE } from '@/lib/note-template';
import { formatDateSlash } from '@/lib/domain-labels';
import type { ClientNote } from '@/lib/api/types';

function NoteCard({ clientId, note }: { clientId: string; note: ClientNote }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
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
      await clientFetchApi(`/clients/${clientId}/notes/${note.id}`, { method: 'PATCH', body: { content } });
      toast.success('メモを更新しました');
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('このメモを削除しますか？添付ファイルも合わせて削除され、この操作は取り消せません。')) {
      return;
    }
    setIsDeleting(true);
    try {
      await clientFetchApi(`/clients/${clientId}/notes/${note.id}`, { method: 'DELETE' });
      toast.success('メモを削除しました');
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
          <p className="text-sm whitespace-pre-wrap text-foreground">{note.content}</p>
        )}

        <NoteAttachments clientId={clientId} noteId={note.id} />
      </CardContent>
    </Card>
  );
}

function NewNoteForm({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const router = useRouter();
  const [content, setContent] = useState(CLIENT_NOTE_TEMPLATE);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!content.trim()) {
      toast.error('内容を入力してください');
      return;
    }
    setIsSaving(true);
    try {
      await clientFetchApi(`/clients/${clientId}/notes`, { method: 'POST', body: { content } });
      toast.success('メモを登録しました');
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
 * 常設メモ(カルテ)タブ。
 * 新規作成時は商談記録用の定型テンプレート(CLIENT_NOTE_TEMPLATE)を自動入力し、
 * そのまま編集して保存できるようにする。各メモにはファイルを添付できる(NoteAttachments)。
 */
export function NotesTab({ clientId, notes }: { clientId: string; notes: ClientNote[] }) {
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!isCreating ? (
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <Plus className="size-4" />
            メモを追加
          </Button>
        ) : null}
      </div>

      {isCreating ? <NewNoteForm clientId={clientId} onClose={() => setIsCreating(false)} /> : null}

      {notes.length === 0 && !isCreating ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <NotebookPen className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              クライアントについて常に知っておくべきメモはまだありません
            </p>
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
