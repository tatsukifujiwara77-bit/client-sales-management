'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { Download, Loader2, Paperclip, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { clientFetchApi, clientUploadFile } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { ClientNoteAttachment } from '@/lib/api/types';

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * 常設メモ1件に紐づく添付ファイルの一覧・アップロード・ダウンロード・削除。
 * ダウンロードは署名付きURL(有効期限5分)を都度発行してから新規タブで開く。
 */
export function NoteAttachments({ clientId, noteId }: { clientId: string; noteId: string }) {
  const [attachments, setAttachments] = useState<ClientNoteAttachment[] | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const basePath = `/clients/${clientId}/notes/${noteId}/attachments`;

  async function load() {
    try {
      const result = await clientFetchApi<ClientNoteAttachment[]>(basePath);
      setAttachments(result);
    } catch {
      setAttachments([]);
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await clientUploadFile(basePath, formData);
      toast.success(`${file.name} を添付しました`);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'ファイルのアップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(attachment: ClientNoteAttachment) {
    setDownloadingId(attachment.id);
    try {
      const { url } = await clientFetchApi<{ url: string }>(`${basePath}/${attachment.id}/download`);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'ダウンロードに失敗しました');
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(attachment: ClientNoteAttachment) {
    if (!window.confirm(`${attachment.fileName} を削除しますか？`)) return;
    setDeletingId(attachment.id);
    try {
      await clientFetchApi(`${basePath}/${attachment.id}`, { method: 'DELETE' });
      setAttachments((prev) => (prev ?? []).filter((a) => a.id !== attachment.id));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '削除に失敗しました');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Paperclip className="size-3.5" />
          添付資料
        </p>
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-input px-2 py-1 text-xs font-medium text-foreground hover:bg-muted">
          {isUploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
          ファイルを添付
          <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
        </label>
      </div>

      {attachments === null ? (
        <p className="text-xs text-muted-foreground">読み込み中…</p>
      ) : attachments.length === 0 ? (
        <p className="text-xs text-muted-foreground">添付ファイルはありません</p>
      ) : (
        <ul className="space-y-1">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-xs"
            >
              <span className="min-w-0 flex-1 truncate text-foreground">
                {attachment.fileName}
                <span className="ml-1 text-muted-foreground">{formatFileSize(attachment.sizeBytes)}</span>
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => handleDownload(attachment)}
                  disabled={downloadingId === attachment.id}
                  aria-label="ダウンロード"
                >
                  {downloadingId === attachment.id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Download className="size-3" />
                  )}
                </Button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => handleDelete(attachment)}
                  disabled={deletingId === attachment.id}
                  className="text-destructive hover:text-destructive"
                  aria-label="削除"
                >
                  {deletingId === attachment.id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3" />
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
