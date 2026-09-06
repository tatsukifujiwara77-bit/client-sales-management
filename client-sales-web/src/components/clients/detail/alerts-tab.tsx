import { Card, CardContent } from '@/components/ui/card';
import { ALERT_TYPE_ICONS, ALERT_TYPE_ICON_CLASSES, ALERT_TYPE_LABELS, formatDateSlash } from '@/lib/domain-labels';
import type { Alert } from '@/lib/api/types';

export function AlertsTab({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="text-2xl">✅</span>
          <p className="text-sm font-medium text-foreground">すべて対応済みです</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const Icon = ALERT_TYPE_ICONS[alert.alertType];
        return (
          <Card key={alert.id}>
            <CardContent className="flex items-center gap-3 py-3">
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-md ${ALERT_TYPE_ICON_CLASSES[alert.alertType]}`}
              >
                <Icon className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{ALERT_TYPE_LABELS[alert.alertType]}</p>
                {alert.targetDate ? (
                  <p className="text-xs text-muted-foreground">{formatDateSlash(alert.targetDate)}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
