'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TEMPERATURE_LABELS } from '@/lib/domain-labels';
import type { Office, SalesStage, Temperature, UserSummary } from '@/lib/api/types';

const ALL = '__all__';

interface ClientsFilterBarProps {
  offices: Office[];
  salesStages: SalesStage[];
  users: UserSummary[];
}

export function ClientsFilterBar({ offices, salesStages, users }: ClientsFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');

  // 検索欄はデバウンスしてURLへ反映する（他のフィルタは選択と同時に即時反映）
  useEffect(() => {
    const current = searchParams.get('search') ?? '';
    if (searchInput === current) return;
    const timer = setTimeout(() => updateParam('search', searchInput || null), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== ALL) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page'); // フィルタを変えたら1ページ目に戻す
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    setSearchInput('');
    router.push(pathname);
  }

  const hasActiveFilters = [...searchParams.keys()].some((k) => k !== 'page');

  // Base UIのSelectは `items` を渡さないと <Select.Value> が生の value をそのまま表示してしまうため、
  // value/label のマッピングを明示的に用意する。
  const officeItems = [
    { value: ALL, label: 'すべての拠点' },
    ...offices.map((o) => ({ value: o.id, label: o.name })),
  ];
  const userItems = [
    { value: ALL, label: 'すべての担当者' },
    ...users.map((u) => ({ value: u.id, label: u.fullName })),
  ];
  const stageItems = [
    { value: ALL, label: 'すべてのフェーズ' },
    ...salesStages.map((s) => ({ value: s.id, label: s.name })),
  ];
  const temperatureValues: Temperature[] = ['high', 'medium', 'low', 'unknown'];
  const temperatureItems = [
    { value: ALL, label: 'すべての温度感' },
    ...temperatureValues.map((t) => ({ value: t, label: TEMPERATURE_LABELS[t] })),
  ];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative min-w-48 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="会社名・所在地で検索"
          className="pl-9"
        />
      </div>

      <Select
        items={officeItems}
        defaultValue={searchParams.get('officeId') ?? ALL}
        onValueChange={(v) => updateParam('officeId', v)}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="拠点" />
        </SelectTrigger>
        <SelectContent>
          {officeItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={userItems}
        defaultValue={searchParams.get('assignedTo') ?? ALL}
        onValueChange={(v) => updateParam('assignedTo', v)}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="担当者" />
        </SelectTrigger>
        <SelectContent>
          {userItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={stageItems}
        defaultValue={searchParams.get('salesStageId') ?? ALL}
        onValueChange={(v) => updateParam('salesStageId', v)}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="営業フェーズ" />
        </SelectTrigger>
        <SelectContent>
          {stageItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={temperatureItems}
        defaultValue={searchParams.get('temperature') ?? ALL}
        onValueChange={(v) => updateParam('temperature', v)}
      >
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder="温度感" />
        </SelectTrigger>
        <SelectContent>
          {temperatureItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters ? (
        <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground">
          <X className="size-4" />
          条件をクリア
        </Button>
      ) : null}
    </div>
  );
}
