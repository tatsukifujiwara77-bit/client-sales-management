'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AlertStatus, Office } from '@/lib/api/types';

const ALL = '__all__';

const STATUS_ITEMS: { value: AlertStatus; label: string }[] = [
  { value: 'open', label: '未対応' },
  { value: 'dismissed', label: '却下済み' },
  { value: 'resolved', label: '解決済み' },
];

export function AlertsFilterBar({ offices }: { offices: Office[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateStatus(value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('status', value ?? 'open');
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  function updateOffice(value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== ALL) {
      params.set('officeId', value);
    } else {
      params.delete('officeId');
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    router.push(pathname);
  }

  const hasActiveFilters = [...searchParams.keys()].some((k) => k !== 'page');

  const officeItems = [
    { value: ALL, label: 'すべての拠点' },
    ...offices.map((o) => ({ value: o.id, label: o.name })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select items={officeItems} defaultValue={searchParams.get('officeId') ?? ALL} onValueChange={updateOffice}>
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

      <Select items={STATUS_ITEMS} defaultValue={searchParams.get('status') ?? 'open'} onValueChange={updateStatus}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="状態" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_ITEMS.map((item) => (
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
