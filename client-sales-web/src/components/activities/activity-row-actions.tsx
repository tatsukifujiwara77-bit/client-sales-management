'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EditActivityDialog, type EditableActivity } from './edit-activity-dialog';
import { clientFetchApi } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';

/**
 * 活動記録1件分の編集・削除ボタン。クライアント詳細の活動履歴タブと、
 * クライアント横断の営業活動一覧の両方から使う共通コンポーネント。
 * 削除はRLS(activities_delete)によりadmin/office_manager限定のため、
 * 権限のないユーザーが押した場合はAPI側のエラーをトーストで表示する。
 */
export function ActivityRowActions({ clientId, activity }: { clientId: string; activity: EditableActivity }) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm('この活動記録を削除しますか？この操作は取り消せません。')) {
      return;
    }
    setIsDeleting(true);
    try {
      await clientFetchApi(`/clients/${clientId}/activities/${activity.id}`, { method: 'DELETE' });
      toast.success('活動記録を削除しました');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '削除に失敗しました');
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="icon-sm" variant="ghost" onClick={() => setIsEditOpen(true)} aria-label="活動記録を編集">
          <Pencil className="size-3.5" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-destructive hover:text-destructive"
          aria-label="活動記録を削除"
        >
          {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        </Button>
      </div>
      <EditActivityDialog clientId={clientId} activity={activity} open={isEditOpen} onOpenChange={setIsEditOpen} />
    </>
  );
}
