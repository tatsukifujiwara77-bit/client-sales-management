'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ClientsTable } from './clients-table';
import type { IndustryColumn } from '@/lib/api/types';

interface ClientsGroupedViewProps {
  columns: IndustryColumn[];
  /** 各行のリンク先(クライアント一覧では/clients、営業リストでは/sales-list) */
  basePath?: string;
}

/**
 * 業種別グループ表示。各クライアントは主業種のグループにのみ表示される
 * (GET /clients/grouped-by-industry側で保証済み)ため、件数の合計は一覧の総件数と一致する。
 * 見出しは業種マスタの並び順+末尾に「未設定」。折りたたみはこの画面内だけのローカル状態。
 */
export function ClientsGroupedView({ columns, basePath = '/clients' }: ClientsGroupedViewProps) {
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {columns.map((column) => {
        const key = column.industry?.id ?? 'unassigned';
        const isCollapsed = collapsedKeys.has(key);
        return (
          <div key={key} className="space-y-2">
            <button
              type="button"
              onClick={() => toggle(key)}
              className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left hover:bg-accent/50"
            >
              {isCollapsed ? (
                <ChevronRight className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
              <span className="font-medium text-foreground">{column.industry?.name ?? '未設定'}</span>
              <span className="text-sm text-muted-foreground">{column.count}件</span>
            </button>
            {!isCollapsed ? (
              <ClientsTable items={column.clients} basePath={basePath} emptyMessage="該当するクライアントがいません" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
