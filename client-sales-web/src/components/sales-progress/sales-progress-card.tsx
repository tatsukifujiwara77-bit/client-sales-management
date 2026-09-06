'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: client.id,
    data: { stageId: client.salesStage.id },
    disabled: isPending || isOverlay,
  });

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      {...(isOverlay ? {} : listeners)}
      {...(isOverlay ? {} : attributes)}
      style={!isOverlay && transform ? { transform: CSS.Translate.toString(transform) } : undefined}
      className={cn(
        'relative touch-none rounded-lg border border-border bg-card p-3 shadow-sm select-none',
        isOverlay ? 'shadow-lg' : 'cursor-grab active:cursor-grabbing',
        !isOverlay && isDragging && 'opacity-40',
      )}
    >
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
