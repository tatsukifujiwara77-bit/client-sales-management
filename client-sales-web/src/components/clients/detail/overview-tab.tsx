import { Star, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateSlash } from '@/lib/domain-labels';
import type { ClientContact, ClientDetail } from '@/lib/api/types';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right text-foreground">{value}</span>
    </div>
  );
}

/** websiteUrlはプロトコル省略入力(例: example.co.jp)も許容しているため、リンク化時に補う */
function toHref(url: string): string {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

export function OverviewTab({
  client,
  contacts,
}: {
  client: ClientDetail;
  contacts: ClientContact[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>会社基本情報</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <InfoRow
            label="ホームページ"
            value={
              client.websiteUrl ? (
                <a
                  href={toHref(client.websiteUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {client.websiteUrl}
                </a>
              ) : (
                '—'
              )
            }
          />
          <InfoRow label="担当拠点" value={client.office?.name ?? '—'} />
          <InfoRow label="担当営業" value={client.primaryAssignee?.fullName ?? '未割当'} />
          <InfoRow label="開拓者" value={client.discoveredBy?.fullName ?? '—'} />
          <InfoRow label="最終訪問日" value={client.lastVisitedAt ? formatDateSlash(client.lastVisitedAt) : '—'} />
          <InfoRow label="最終活動日" value={client.lastActivityAt ? formatDateSlash(client.lastActivityAt) : '—'} />
          {client.lossReason ? <InfoRow label="失注理由" value={client.lossReason.name} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>クライアントの特徴・注意事項</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">クライアントの特徴</p>
            <p className="text-sm whitespace-pre-wrap text-foreground">{client.characteristics || '記載なし'}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">注意事項</p>
            <p className="text-sm whitespace-pre-wrap text-foreground">{client.cautionNotes || '記載なし'}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>重要人物</CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">登録された連絡先はありません</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex items-start gap-3 rounded-md border border-border p-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <User className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-sm font-medium text-foreground">
                      {contact.name}
                      {contact.isKeyPerson ? <Star className="size-3.5 fill-warning text-warning" /> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[contact.department, contact.position].filter(Boolean).join(' / ') || '—'}
                    </p>
                    {contact.phone ? <p className="text-xs text-muted-foreground">{contact.phone}</p> : null}
                    {contact.email ? <p className="text-xs text-muted-foreground">{contact.email}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
