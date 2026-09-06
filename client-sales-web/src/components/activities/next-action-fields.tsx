'use client';

import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NOTIFY_BEFORE_LABELS, type NotifyBefore } from '@/lib/domain-labels';

const NOTIFY_BEFORE_VALUES: NotifyBefore[] = ['none', '1_day', '3_days', '1_week'];
const NOTIFY_BEFORE_ITEMS = NOTIFY_BEFORE_VALUES.map((value) => ({ value, label: NOTIFY_BEFORE_LABELS[value] }));

export function tomorrowDateString(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

interface NextActionFieldsProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  notifyBefore: NotifyBefore;
  onNotifyBeforeChange: (value: NotifyBefore) => void;
}

/**
 * 活動記録ダイアログに埋め込む「次回アクションを登録」の折りたたみセクション。
 * AddActionItemDialogと同じ項目(内容/対応予定日/通知タイミング)を、活動記録と同時に
 * 登録できるようにする。内容・対応予定日はFormData経由(name="nextActionContent"/
 * "nextActionDueDate")で送るため、呼び出し側のhandleSubmitでformData.get()して読み取る。
 */
export function NextActionFields({
  enabled,
  onEnabledChange,
  notifyBefore,
  onNotifyBeforeChange,
}: NextActionFieldsProps) {
  if (!enabled) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => onEnabledChange(true)}>
        <Plus className="size-3.5" />
        次回アクションも登録する
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">次回アクション</p>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={() => onEnabledChange(false)}
          aria-label="次回アクションの登録をやめる"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nextActionContent">内容</Label>
        <Textarea id="nextActionContent" name="nextActionContent" rows={2} required placeholder="例: 提案資料のご説明" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nextActionDueDate">対応予定日</Label>
        <Input id="nextActionDueDate" name="nextActionDueDate" type="date" required defaultValue={tomorrowDateString()} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>通知タイミング</Label>
        <Select
          items={NOTIFY_BEFORE_ITEMS}
          value={notifyBefore}
          onValueChange={(v) => onNotifyBeforeChange(v as NotifyBefore)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOTIFY_BEFORE_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
