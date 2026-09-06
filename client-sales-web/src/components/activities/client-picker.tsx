'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { clientFetchApi } from '@/lib/api/client';
import type { ClientListItem, PagedResult } from '@/lib/api/types';

export interface PickedClient {
  id: string;
  companyName: string;
}

interface ClientPickerProps {
  value: PickedClient | null;
  onChange: (client: PickedClient | null) => void;
}

/**
 * 会社名で検索してクライアントを1件選ぶための軽量コンボボックス。
 * プロジェクトに既存のコンボボックス/コマンドパレット系コンポーネントが無いため、
 * 既存のUI部品（Input）を組み合わせた自作の最小限の実装にしている。
 */
export function ClientPicker({ value, onChange }: ClientPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientListItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // 空文字のときは何もしない。ドロップダウン自体を isOpen && query.trim() で
    // 非表示にしているので、results を空にしなくても見た目には影響しない。
    if (!query.trim()) {
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ search: query, page: '1', pageSize: '8' });
        const result = await clientFetchApi<PagedResult<ClientListItem>>(`/clients?${params.toString()}`);
        setResults(result.items);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-input px-2.5 py-2 text-sm">
        <span className="font-medium text-foreground">{value.companyName}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="選び直す"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="会社名で検索"
          className="pl-9"
        />
        {isLoading ? (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {isOpen && query.trim() ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-md">
          {results.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">
              {isLoading ? '検索中…' : '該当するクライアントが見つかりません'}
            </p>
          ) : (
            <ul className="max-h-56 overflow-y-auto py-1">
              {results.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ id: client.id, companyName: client.companyName });
                      setQuery('');
                      setResults([]);
                      setIsOpen(false);
                    }}
                    className="flex w-full flex-col items-start px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="font-medium text-foreground">{client.companyName}</span>
                    {client.address ? <span className="text-xs text-muted-foreground">{client.address}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
