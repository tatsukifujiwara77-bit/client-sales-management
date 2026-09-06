import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AddActionItemDialog } from './add-action-item-dialog';
import { CompleteActionItemButton } from './complete-action-item-button';
import { formatDateWithWeekday } from '@/lib/domain-labels';
import type { ActionItem } from '@/lib/api/types';

const STATUS_LABELS: Record<ActionItem['status'], string> = {
  pending: '未対応',
  done: '対応済み',
  cancelled: 'キャンセル',
};

const STATUS_CLASSES: Record<ActionItem['status'], string> = {
  pending: 'bg-warning/20 text-warning-foreground',
  done: 'bg-success/15 text-success',
  cancelled: 'bg-muted text-muted-foreground',
};

export function ActionItemsTab({ clientId, actionItems }: { clientId: string; actionItems: ActionItem[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddActionItemDialog clientId={clientId} />
      </div>

      {actionItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            対応予定のアクションはありません
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {actionItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center gap-4 py-3">
                <span className="w-24 shrink-0 text-sm font-medium text-foreground">
                  {formatDateWithWeekday(item.dueDate)}
                </span>
                <span className="flex-1 text-sm text-foreground">{item.content}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{item.assignee.fullName}</span>
                <Badge className={STATUS_CLASSES[item.status]}>{STATUS_LABELS[item.status]}</Badge>
                {item.status === 'pending' ? (
                  <CompleteActionItemButton clientId={clientId} actionItemId={item.id} />
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
