'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { clientFetchApi } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { ACTIVITY_TYPE_LABELS, type ActivityType } from '@/lib/domain-labels';
import type { Activity } from '@/lib/api/types';

// 訪問／商談／オンラインは商談メモ(client_notes)側で記録する運用に変更したため、
// 新規に選べる種別は電話／メール／その他のみ。ただし過去にこれらの種別で
// 記録された活動を編集する際に選択肢から消えてしまわないよう、編集中の値が
// この3種に含まれない場合はその値も選択肢に追加する（buildActivityTypeItems）。
const ACTIVITY_TYPES: ActivityType[] = ['call', 'email', 'other'];

function buildActivityTypeItems(currentType: ActivityType) {
  const types = ACTIVITY_TYPES.includes(currentType) ? ACTIVITY_TYPES : [currentType, ...ACTIVITY_TYPES];
  return types.map((type) => ({ value: type, label: ACTIVITY_TYPE_LABELS[type] }));
}

// participantsは任意: クライアント横断の活動一覧(ActivityWithClient)にはこの項目が含まれないため、
// そちらから編集する場合は空欄から入力する形になる(既存値を空欄のまま保存しても上書きはされない)。
export type EditableActivity = Pick<Activity, 'id' | 'activityType' | 'activityDate' | 'notes'> & {
  participants?: string | null;
};

interface EditActivityDialogProps {
  clientId: string;
  activity: EditableActivity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** 既存の活動記録を編集するダイアログ（AddActivityDialogと同じ項目、値を事前入力してPATCHする）。 */
export function EditActivityDialog({ clientId, activity, open, onOpenChange }: EditActivityDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activityType, setActivityType] = useState<ActivityType>(activity.activityType);
  const activityTypeItems = buildActivityTypeItems(activity.activityType);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    try {
      await clientFetchApi(`/clients/${clientId}/activities/${activity.id}`, {
        method: 'PATCH',
        body: {
          activityType,
          activityDate: formData.get('activityDate'),
          participants: formData.get('participants') || undefined,
          notes: formData.get('notes') || undefined,
        },
      });
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : '更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>営業活動を編集</DialogTitle>
            <DialogDescription>記録した活動内容を編集します。</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label>活動種別</Label>
              <Select
                items={activityTypeItems}
                value={activityType}
                onValueChange={(v) => setActivityType(v as ActivityType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activityTypeItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`activityDate-${activity.id}`}>活動日</Label>
              <Input
                id={`activityDate-${activity.id}`}
                name="activityDate"
                type="date"
                required
                defaultValue={activity.activityDate.slice(0, 10)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`participants-${activity.id}`}>先方</Label>
              <Input
                id={`participants-${activity.id}`}
                name="participants"
                defaultValue={activity.participants ?? ''}
                placeholder="例: 髙江洲様"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`notes-${activity.id}`}>メモ</Label>
              <Textarea id={`notes-${activity.id}`} name="notes" rows={5} defaultValue={activity.notes ?? ''} />
            </div>

            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              更新する
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
