'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Office } from '@/lib/api/types';

const ALL = '__all__';

/** 営業進捗Kanbanの拠点フィルタ。クライアント一覧の絞り込みと同じURLパラメータ(officeId)を使う。 */
export function SalesProgressFilterBar({ offices }: { offices: Office[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const officeItems = [
    { value: ALL, label: 'すべての拠点' },
    ...offices.map((o) => ({ value: o.id, label: o.name })),
  ];

  function updateOffice(value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== ALL) {
      params.set('officeId', value);
    } else {
      params.delete('officeId');
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select items={officeItems} defaultValue={searchParams.get('officeId') ?? ALL} onValueChange={updateOffice}>
      <SelectTrigger className="w-full sm:w-44">
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
  );
}
