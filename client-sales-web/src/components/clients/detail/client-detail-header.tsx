import Link from 'next/link';
import { AlertCircle, ArrowLeft, Building2, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ClientDetailActions } from '@/components/clients/detail/client-detail-actions';
import { TEMPERATURE_LABELS } from '@/lib/domain-labels';
import { formatDateWithWeekday } from '@/lib/domain-labels';
import type { ClientDetail, NextActionSummary } from '@/lib/api/types';

const TEMPERATURE_EMOJI: Record<ClientDetail['temperature'], string> = {
  high: '🔥',
  medium: '🟡',
  low: '🔵',
  unknown: '⚪',
};

export function ClientDetailHeader({ client, nextAction }: { client: ClientDetail; nextAction: NextActionSummary | null }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          クライアント一覧へ戻る
        </Link>
        <ClientDetailActions clientId={client.id} companyName={client.companyName} />
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Building2 className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{client.companyName}</h1>
              {client.address ? (
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" />
                  {client.address}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                  {client.salesStage.name}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <span aria-hidden>{TEMPERATURE_EMOJI[client.temperature]}</span>
                  温度感: {TEMPERATURE_LABELS[client.temperature]}
                </span>
                {client.office ? (
                  <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {client.office.name}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">担当営業</span>
            {client.primaryAssignee ? (
              <span className="flex items-center gap-2">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">
                    {client.primaryAssignee.fullName.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground">{client.primaryAssignee.fullName}</span>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">未割当</span>
            )}
          </div>
        </div>

        {nextAction ? (
          <div className="mt-4 flex items-center gap-3 rounded-md border border-warning/30 bg-warning/10 px-4 py-3">
            <AlertCircle className="size-5 shrink-0 text-warning-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-warning-foreground">次回アクション</p>
              <p className="truncate text-sm text-foreground">{nextAction.content}</p>
            </div>
            <span className="shrink-0 text-sm font-medium text-warning-foreground">
              {formatDateWithWeekday(nextAction.dueDate)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
