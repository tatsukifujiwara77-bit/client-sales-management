'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from 'cn';

export interface MultiSelectItem {
  value: string;
  label: string;
}

interface MultiSelectProps {
  items: MultiSelectItem[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

/**
 * 複数選択可能なドロップダウン(チェックボックス付き)。
 * このUIキットには単一選択のSelectしか無いため、業種等の複数選択フィルタ・タグ入力用に
 * ClientPicker(自作コンボボックス)と同じ「外側クリックで閉じる」パターンで新設する。
 */
export function MultiSelect({ items, selected, onChange, placeholder = '選択してください', className }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  const selectedLabels = items.filter((item) => selected.includes(item.value)).map((item) => item.label);
  const summary =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join('、')
        : `${selectedLabels[0]} 他${selectedLabels.length - 1}件`;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className={cn('truncate text-left', selectedLabels.length === 0 && 'text-muted-foreground')}>
          {summary}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {isOpen ? (
        <div className="absolute z-50 mt-1 w-full min-w-48 overflow-hidden rounded-lg border border-border bg-popover shadow-md">
          <ul className="max-h-64 overflow-y-auto py-1">
            {items.map((item) => {
              const checked = selected.includes(item.value);
              return (
                <li key={item.value}>
                  <button
                    type="button"
                    onClick={() => toggle(item.value)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <span
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-sm border border-input',
                        checked && 'border-primary bg-primary text-primary-foreground',
                      )}
                    >
                      {checked ? <Check className="size-3" /> : null}
                    </span>
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
