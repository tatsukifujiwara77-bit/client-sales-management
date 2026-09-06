'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { clientFetchApi } from '@/lib/api/client';
import { NOTIFY_BEFORE_LABELS, type NotifyBefore } from '@/lib/domain-labels';

const NOTIFY_BEFORE_VALUES: NotifyBefore[] = ['none', '1_day', '3_days', '1_week'];
const NOTIFY_BEFORE_ITEMS = NOTIFY_BEFORE_VALUES.map((value) => ({ value, label: NOTIFY_BEFORE_LABELS[value] }));

function tomorrowDateString(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function AddActionItemDialog({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notifyBefore, setNotifyBefore] = useState<NotifyBefore>('none');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    try {
      await clientFetchApi(`/clients/${clientId}/action-items`, {
        method: 'POST',
        body: {
          content: formData.get('content'),
          dueDate: formData.get('dueDate'),
          notifyBefore,
        },
      });
      setOpen(false);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Plus className="size-4" />
        次回アクションを登録
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>次回アクションを登録</DialogTitle>
            <DialogDescription>次に対応すべき内容と対応予定日を登録します。</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="content">内容</Label>
              <Textarea id="content" name="content" rows={3} required placeholder="例: 提案資料のご説明" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dueDate">対応予定日</Label>
              <Input id="dueDate" name="dueDate" type="date" required defaultValue={tomorrowDateString()} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>通知タイミング</Label>
              <Select
                items={NOTIFY_BEFORE_ITEMS}
                value={notifyBefore}
                onValueChange={(v) => setNotifyBefore(v as NotifyBefore)}
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

            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              登録する
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
