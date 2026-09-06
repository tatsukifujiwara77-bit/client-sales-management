'use client';

import { useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { clientFetchApi } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { cn } from '@/lib/utils';
import { formatDateSlash, TEMPERATURE_EMOJI, TEMPERATURE_LABELS } from '@/lib/domain-labels';
import type { ClientListItem } from '@/lib/api/types';

interface SalesProgressCardProps {
  client: ClientListItem;
  /** 通信中（このカードのフェーズ変更APIが完了していない）かどうか */
  isPending?: boolean;
  /** DragOverlay用に描画する場合はドラッグの掴み判定を無効化する */
  isOverlay?: boolean;
}

export function SalesProgressCard({ client, isPending, isOverlay }: SalesProgressCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: client.id,
    data: { stageId: client.salesStage.id },
    disabled: isPending || isOverlay,
  });

  async function handleDelete(event: MouseEvent) {
    event.stopPropagation();
    if (!window.confirm(`${client.companyName} を削除しますか？関連する活動・アラート等もすべて削除され、この操作は取り消せません。`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await clientFetchApi(`/clients/${client.id}`, { method: 'DELETE' });
      toast.success(`${client.companyName} を削除しました`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '削除に失敗しました');
      setIsDeleting(false);
    }
  }

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      {...(isOverlay ? {} : listeners)}
      {...(isOverlay ? {} : attributes)}
      // activationConstraint(8px)により、ドラッグにならなかった通常のクリックはここまで到達する。
      // カードをクリックすると詳細ページへ遷移する(そちらでも編集・削除ができる)。
      onClick={isOverlay ? undefined : () => router.push(`/clients/${client.id}`)}
      style={!isOverlay && transform ? { transform: CSS.Translate.toString(transform) } : undefined}
      className={cn(
        'relative touch-none rounded-lg border border-border bg-card p-3 pr-14 shadow-sm select-none',
        isOverlay ? 'shadow-lg' : 'cursor-grab active:cursor-grabbing',
        !isOverlay && isDragging && 'opacity-40',
      )}
    >
      {!isOverlay ? (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5">
          <Link
            href={`/clients/${client.id}/edit`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="編集"
          >
            <Pencil className="size-3.5" />
          </Link>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            aria-label="削除"
          >
            {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          </button>
        </div>
      ) : null}

      <p className="line-clamp-2 text-sm font-semibold text-foreground">{client.companyName}</p>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span aria-hidden>{TEMPERATURE_EMOJI[client.temperature]}</span>
        <span>{TEMPERATURE_LABELS[client.temperature]}</span>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        {client.primaryAssignee ? (
          <>
            <Avatar className="size-5">
              <AvatarFallback className="bg-secondary text-[9px] text-secondary-foreground">
                {client.primaryAssignee.fullName.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-foreground">{client.primaryAssignee.fullName}</span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">未割当</span>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        最終訪問: {client.lastVisitedAt ? formatDateSlash(client.lastVisitedAt) : '—'}
      </p>

      {isPending ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-card/70">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : null}
    </div>
  );
}
