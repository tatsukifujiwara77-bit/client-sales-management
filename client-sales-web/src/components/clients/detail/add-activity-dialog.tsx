'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { NextActionFields } from '@/components/activities/next-action-fields';
import { clientFetchApi } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { ACTIVITY_TYPE_LABELS, type ActivityType, type NotifyBefore } from '@/lib/domain-labels';
import { CLIENT_NOTE_TEMPLATE } from '@/lib/note-template';
import type { Activity } from '@/lib/api/types';

const ACTIVITY_TYPES: ActivityType[] = ['visit', 'meeting', 'call', 'email', 'online', 'other'];
const ACTIVITY_TYPE_ITEMS = ACTIVITY_TYPES.map((type) => ({ value: type, label: ACTIVITY_TYPE_LABELS[type] }));

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddActivityDialog({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activityType, setActivityType] = useState<ActivityType>('visit');
  const [showNextAction, setShowNextAction] = useState(false);
  const [nextActionNotifyBefore, setNextActionNotifyBefore] = useState<NotifyBefore>('none');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    try {
      const activity = await clientFetchApi<Activity>(`/clients/${clientId}/activities`, {
        method: 'POST',
        body: {
          activityType,
          activityDate: formData.get('activityDate'),
          participants: formData.get('participants') || undefined,
          notes: formData.get('notes') || undefined,
        },
      });

      if (showNextAction) {
        try {
          await clientFetchApi(`/clients/${clientId}/action-items`, {
            method: 'POST',
            body: {
              content: formData.get('nextActionContent'),
              dueDate: formData.get('nextActionDueDate'),
              notifyBefore: nextActionNotifyBefore,
              sourceActivityId: activity.id,
            },
          });
        } catch (actionItemError) {
          toast.error(
            actionItemError instanceof ApiError
              ? `活動は記録されましたが、次回アクションの登録に失敗しました: ${actionItemError.message}`
              : '活動は記録されましたが、次回アクションの登録に失敗しました',
          );
        }
      }

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
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        活動を記録
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>営業活動を記録</DialogTitle>
            <DialogDescription>訪問・商談・電話などの活動内容を記録します。</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label>活動種別</Label>
              <Select
                items={ACTIVITY_TYPE_ITEMS}
                value={activityType}
                onValueChange={(v) => setActivityType(v as ActivityType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPE_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="activityDate">活動日</Label>
              <Input id="activityDate" name="activityDate" type="date" required defaultValue={todayDateString()} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="participants">参加者</Label>
              <Input id="participants" name="participants" placeholder="例: 先方 髙江洲様 / 当社 藤原" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">商談メモ</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={16}
                className="font-mono text-sm"
                defaultValue={CLIENT_NOTE_TEMPLATE}
              />
            </div>

            <NextActionFields
              enabled={showNextAction}
              onEnabledChange={setShowNextAction}
              notifyBefore={nextActionNotifyBefore}
              onNotifyBeforeChange={setNextActionNotifyBefore}
            />

            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              記録する
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
