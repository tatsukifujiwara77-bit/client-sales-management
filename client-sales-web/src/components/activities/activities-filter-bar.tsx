'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ACTIVITY_TYPE_LABELS, type ActivityType } from '@/lib/domain-labels';
import type { Office } from '@/lib/api/types';

const ALL = '__all__';
const ACTIVITY_TYPES: ActivityType[] = ['visit', 'meeting', 'call', 'email', 'online', 'other'];

export function ActivitiesFilterBar({ offices }: { offices: Office[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== ALL) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    router.push(pathname);
  }

  const hasActiveFilters = [...searchParams.keys()].some((k) => k !== 'page');

  const typeItems = [
    { value: ALL, label: 'すべての種別' },
    ...ACTIVITY_TYPES.map((t) => ({ value: t, label: ACTIVITY_TYPE_LABELS[t] })),
  ];
  const officeItems = [
    { value: ALL, label: 'すべての拠点' },
    ...offices.map((o) => ({ value: o.id, label: o.name })),
  ];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
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
        items={typeItems}
        defaultValue={searchParams.get('activityType') ?? ALL}
        onValueChange={(v) => updateParam('activityType', v)}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="活動種別" />
        </SelectTrigger>
        <SelectContent>
          {typeItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          defaultValue={searchParams.get('dateFrom') ?? ''}
          onChange={(e) => updateParam('dateFrom', e.target.value || null)}
          className="w-full sm:w-40"
          aria-label="期間(開始)"
        />
        <span className="text-sm text-muted-foreground">〜</span>
        <Input
          type="date"
          defaultValue={searchParams.get('dateTo') ?? ''}
          onChange={(e) => updateParam('dateTo', e.target.value || null)}
          className="w-full sm:w-40"
          aria-label="期間(終了)"
        />
      </div>

      {hasActiveFilters ? (
        <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground">
          <X className="size-4" />
          条件をクリア
        </Button>
      ) : null}
    </div>
  );
}
