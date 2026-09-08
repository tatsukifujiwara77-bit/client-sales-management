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
import { NextActionFields } from './next-action-fields';
import { clientFetchApi } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { ACTIVITY_TYPE_LABELS, type ActivityType, type NotifyBefore } from '@/lib/domain-labels';
import { ClientPicker, type PickedClient } from './client-picker';
import type { Activity } from '@/lib/api/types';

// 「商談」だけは商談メモ(client_notes)側で詳細を記録する運用のため除外する。
// 訪問／オンラインは活動履歴側にも残す(商談メモとは別に、簡易的な活動記録として使う)。
const ACTIVITY_TYPES: ActivityType[] = ['visit', 'online', 'call', 'email', 'other'];
const ACTIVITY_TYPE_ITEMS = ACTIVITY_TYPES.map((type) => ({ value: type, label: ACTIVITY_TYPE_LABELS[type] }));

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 営業活動一覧画面（クライアント横断）用の活動登録ダイアログ。
 * クライアント詳細内の AddActivityDialog と違い、先にクライアントを選ぶ手順が要る。
 * 設計書 11.4「スマホUI：訪問先から1〜2分で登録」に沿って、最少操作で完了できるようにする。
 */
export function AddActivityGlobalDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [client, setClient] = useState<PickedClient | null>(null);
  const [activityType, setActivityType] = useState<ActivityType>('visit');
  const [showNextAction, setShowNextAction] = useState(false);
  const [nextActionNotifyBefore, setNextActionNotifyBefore] = useState<NotifyBefore>('none');

  function resetAndClose() {
    setOpen(false);
    setClient(null);
    setActivityType('visit');
    setErrorMessage(null);
    setShowNextAction(false);
    setNextActionNotifyBefore('none');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) {
      setErrorMessage('クライアントを選択してください');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    try {
      const activity = await clientFetchApi<Activity>(`/clients/${client.id}/activities`, {
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
          await clientFetchApi(`/clients/${client.id}/action-items`, {
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

      resetAndClose();
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : resetAndClose())}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        活動を記録
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>営業活動を記録</DialogTitle>
            <DialogDescription>クライアントを選んで、訪問・電話などの活動内容を簡易的に記録します。</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label>クライアント</Label>
              <ClientPicker value={client} onChange={setClient} />
            </div>

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
              <Label htmlFor="participants">先方</Label>
              <Input id="participants" name="participants" placeholder="例: 髙江洲様" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">メモ</Label>
              <Textarea id="notes" name="notes" rows={5} />
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
