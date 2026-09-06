'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { toast } from 'sonner';
import { clientFetchApi } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { SalesProgressColumn } from './sales-progress-column';
import { SalesProgressCard } from './sales-progress-card';
import type { ClientListItem, PipelineColumn } from '@/lib/api/types';

interface SalesProgressBoardProps {
  initialColumns: PipelineColumn[];
}

/**
 * 営業進捗Kanban盤。
 * カラムの並び順・件数は clients/pipeline のレスポンスをそのままローカル state に反映し、
 * ドラッグ&ドロップ時は PATCH /clients/:id (salesStageId) を呼んで反映する（設計書 11.4）。
 * 通信が失敗した場合は元のカラムに戻し、トーストでエラーを表示する。
 */
export function SalesProgressBoard({ initialColumns }: SalesProgressBoardProps) {
  const [columns, setColumns] = useState<PipelineColumn[]>(initialColumns);
  const [pendingClientIds, setPendingClientIds] = useState<Set<string>>(new Set());
  const [activeClient, setActiveClient] = useState<ClientListItem | null>(null);

  // カード上の削除操作(router.refresh())後にサーバーの最新状態を反映するため、
  // 親から渡されるinitialColumnsが変わったらローカルstateも追従させる。
  // (useEffectではなくレンダー中に比較・更新することで、古い状態が一瞬表示されるのを防ぐ)
  const [prevInitialColumns, setPrevInitialColumns] = useState(initialColumns);
  if (initialColumns !== prevInitialColumns) {
    setPrevInitialColumns(initialColumns);
    setColumns(initialColumns);
  }

  const sensors = useSensors(
    // 8px動かすまではドラッグ開始しない（クリックとの誤反応を防ぐ）
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    const client = columns.flatMap((c) => c.clients).find((c) => c.id === id);
    setActiveClient(client ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveClient(null);

    const clientId = String(event.active.id);
    const fromStageId = event.active.data.current?.stageId as string | undefined;
    const toStageId = event.over ? String(event.over.id) : undefined;
    if (!fromStageId || !toStageId || fromStageId === toStageId) return;

    const snapshot = columns;
    const fromIdx = snapshot.findIndex((c) => c.stage.id === fromStageId);
    const toIdx = snapshot.findIndex((c) => c.stage.id === toStageId);
    if (fromIdx === -1 || toIdx === -1) return;
    const movingClient = snapshot[fromIdx].clients.find((c) => c.id === clientId);
    if (!movingClient) return;

    const optimistic = snapshot.map((col, idx) => {
      if (idx === fromIdx) {
        return { ...col, count: col.count - 1, clients: col.clients.filter((c) => c.id !== clientId) };
      }
      if (idx === toIdx) {
        const updatedClient: ClientListItem = {
          ...movingClient,
          salesStage: { id: col.stage.id, name: col.stage.name, isClosed: col.stage.isClosed },
        };
        return { ...col, count: col.count + 1, clients: [updatedClient, ...col.clients] };
      }
      return col;
    });

    setColumns(optimistic);
    setPendingClientIds((prev) => new Set(prev).add(clientId));

    try {
      await clientFetchApi(`/clients/${clientId}`, {
        method: 'PATCH',
        body: { salesStageId: toStageId },
      });
    } catch (error) {
      setColumns(snapshot);
      toast.error(error instanceof ApiError ? error.message : '営業フェーズの更新に失敗しました');
    } finally {
      setPendingClientIds((prev) => {
        const next = new Set(prev);
        next.delete(clientId);
        return next;
      });
    }
  }

  return (
    // id を固定しないと、アクセシビリティ用の内部id(DndDescribedBy-N)がSSRとハイドレーションで
    // ズレて hydration mismatch 警告が出るため明示的に指定する（dnd-kit公式の推奨）。
    <DndContext id="sales-progress-board" sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-1 snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:snap-none">
        {columns.map((column) => (
          <SalesProgressColumn
            key={column.stage.id}
            stage={column.stage}
            count={column.count}
            clients={column.clients}
            pendingClientIds={pendingClientIds}
          />
        ))}
      </div>

      <DragOverlay>{activeClient ? <SalesProgressCard client={activeClient} isOverlay /> : null}</DragOverlay>
    </DndContext>
  );
}
