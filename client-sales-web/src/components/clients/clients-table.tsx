import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDateSlash, TEMPERATURE_EMOJI, TEMPERATURE_LABELS } from '@/lib/domain-labels';
import type { ClientListItem } from '@/lib/api/types';

export function ClientsTable({ items }: { items: ClientListItem[] }) {
  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          条件に一致するクライアントが見つかりませんでした
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="min-w-[64rem]">
            <TableHeader>
              <TableRow>
                <TableHead>会社名</TableHead>
                <TableHead>担当拠点</TableHead>
                <TableHead>担当営業</TableHead>
                <TableHead>営業フェーズ</TableHead>
                <TableHead>温度感</TableHead>
                <TableHead>最終活動日</TableHead>
                <TableHead>最終訪問日</TableHead>
                <TableHead>次回アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="max-w-52">
                    <Link href={`/clients/${client.id}`} className="font-medium text-foreground hover:underline">
                      <span className="line-clamp-1">{client.companyName}</span>
                    </Link>
                    {client.address ? (
                      <span className="line-clamp-1 block text-xs text-muted-foreground">{client.address}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {client.office?.name ?? '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {client.primaryAssignee ? (
                      <span className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarFallback className="bg-secondary text-[10px] text-secondary-foreground">
                            {client.primaryAssignee.fullName.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-foreground">{client.primaryAssignee.fullName}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">未割当</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="inline-flex items-center rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                      {client.salesStage.name}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span aria-hidden>{TEMPERATURE_EMOJI[client.temperature]}</span>{' '}
                    <span className="text-muted-foreground">{TEMPERATURE_LABELS[client.temperature]}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {client.lastActivityAt ? formatDateSlash(client.lastActivityAt) : '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {client.lastVisitedAt ? formatDateSlash(client.lastVisitedAt) : '—'}
                  </TableCell>
                  <TableCell className="max-w-56">
                    {client.nextAction ? (
                      <>
                        <span className="line-clamp-1 block text-foreground">{client.nextAction.content}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateSlash(client.nextAction.dueDate)}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
