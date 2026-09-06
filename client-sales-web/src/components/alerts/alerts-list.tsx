import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { AlertStatusButton } from './alert-status-button';
import { ALERT_TYPE_ICONS, ALERT_TYPE_ICON_CLASSES, ALERT_TYPE_LABELS, formatDateSlash } from '@/lib/domain-labels';
import type { Alert } from '@/lib/api/types';

/** アラート一覧画面（設計書 7.2）。状態が「未対応」のときだけ却下・解決の操作を出す。 */
export function AlertsList({ alerts }: { alerts: Alert[] }) {
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
            <CardContent className="flex flex-wrap items-center gap-3 py-3">
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-md ${ALERT_TYPE_ICON_CLASSES[alert.alertType]}`}
              >
                <Icon className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/clients/${alert.clientId}`} className="font-medium text-foreground hover:underline">
                  {alert.clientName}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {ALERT_TYPE_LABELS[alert.alertType]}
                  {alert.targetDate ? ` ・ ${formatDateSlash(alert.targetDate)}` : null}
                  {alert.primaryAssignee ? ` ・ 担当: ${alert.primaryAssignee.fullName}` : null}
                </p>
              </div>

              {alert.status === 'open' ? (
                <div className="flex shrink-0 items-center gap-2">
                  <AlertStatusButton alertId={alert.id} status="dismissed" />
                  <AlertStatusButton alertId={alert.id} status="resolved" />
                </div>
              ) : (
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {alert.status === 'dismissed' ? '却下済み' : '解決済み'}
                </span>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
