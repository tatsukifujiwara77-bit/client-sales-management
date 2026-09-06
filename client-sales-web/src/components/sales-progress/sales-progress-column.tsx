'use client';

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { SalesProgressCard } from './sales-progress-card';
import type { ClientListItem } from '@/lib/api/types';

interface SalesProgressColumnProps {
  stage: { id: string; name: string };
  count: number;
  clients: ClientListItem[];
  pendingClientIds: Set<string>;
}

export function SalesProgressColumn({ stage, count, clients, pendingClientIds }: SalesProgressColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div className="flex w-[85vw] shrink-0 snap-center flex-col gap-2 sm:w-72 md:w-64 lg:w-72">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-foreground">{stage.name}</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{count}</span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-40 flex-1 flex-col gap-2 rounded-xl border border-dashed border-border bg-muted/30 p-2 transition-colors',
          isOver && 'border-primary/40 bg-accent/50',
        )}
      >
        {clients.length === 0 ? (
          <p className="flex flex-1 items-center justify-center py-8 text-center text-xs text-muted-foreground">
            クライアントがいません
          </p>
        ) : (
          clients.map((client) => (
            <SalesProgressCard key={client.id} client={client} isPending={pendingClientIds.has(client.id)} />
          ))
        )}
      </div>
    </div>
  );
}
