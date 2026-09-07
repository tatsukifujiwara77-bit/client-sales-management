'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, UserCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { clientFetchApi } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { formatDateSlash, USER_ROLE_LABELS, type UserRole } from '@/lib/domain-labels';
import type { Office, PendingUser } from '@/lib/api/types';

const ROLE_OPTIONS: UserRole[] = ['sales_rep', 'office_manager', 'admin'];
const NO_OFFICE_VALUE = '__none__';

function PendingUserRow({ user, offices }: { user: PendingUser; offices: Office[] }) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>(user.role);
  const [officeId, setOfficeId] = useState<string>(user.officeId ?? NO_OFFICE_VALUE);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Base UIのSelectは`items`を渡さないと<SelectValue>が生の value をそのまま表示してしまうため、
  // value/labelのマッピングを明示的に用意する(client-form.tsx等と同じ対応)。
  const roleItems = ROLE_OPTIONS.map((option) => ({ value: option, label: USER_ROLE_LABELS[option] }));
  const officeItems = [
    { value: NO_OFFICE_VALUE, label: '未割当' },
    ...offices.map((office) => ({ value: office.id, label: office.name })),
  ];

  async function handleApprove() {
    setIsApproving(true);
    try {
      await clientFetchApi(`/users/${user.id}/approve`, {
        method: 'PATCH',
        body: { role, officeId: officeId === NO_OFFICE_VALUE ? null : officeId },
      });
      toast.success(`${user.fullName}さんを承認しました`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '承認に失敗しました');
    } finally {
      setIsApproving(false);
    }
  }

  async function handleReject() {
    if (!window.confirm(`${user.fullName}さんの申請を却下しますか？この操作は取り消せません。`)) {
      return;
    }
    setIsRejecting(true);
    try {
      await clientFetchApi(`/users/${user.id}`, { method: 'DELETE' });
      toast.success(`${user.fullName}さんの申請を却下しました`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '却下に失敗しました');
    } finally {
      setIsRejecting(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-3 py-3">
        <div className="min-w-40 flex-1">
          <p className="text-sm font-medium text-foreground">{user.fullName}</p>
          <p className="text-xs text-muted-foreground">申請日 {formatDateSlash(user.createdAt.slice(0, 10))}</p>
        </div>

        <div className="flex w-40 flex-col gap-1.5">
          <Label>ロール</Label>
          <Select items={roleItems} value={role} onValueChange={(value) => setRole(value as UserRole)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {USER_ROLE_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-44 flex-col gap-1.5">
          <Label>拠点</Label>
          <Select items={officeItems} value={officeId} onValueChange={(value) => setOfficeId(value ?? NO_OFFICE_VALUE)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_OFFICE_VALUE}>未割当</SelectItem>
              {offices.map((office) => (
                <SelectItem key={office.id} value={office.id}>
                  {office.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleReject}
          disabled={isApproving || isRejecting}
          className="text-destructive hover:text-destructive"
        >
          {isRejecting ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
          却下する
        </Button>
        <Button size="sm" onClick={handleApprove} disabled={isApproving || isRejecting}>
          {isApproving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
          承認する
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * ユーザー承認（設定画面「ユーザー承認」タブ、管理者のみ）。
 * Googleログインで自動作成されるprofilesは is_active=false（承認待ち）の状態で始まるため、
 * ここでロール・拠点を確定させた上で有効化する（PATCH /users/:id/approve）。
 */
export function PendingUsersSettings({ users, offices }: { users: PendingUser[]; offices: Office[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Googleでログインしたものの、まだ利用が許可されていないアカウントの一覧です。ロールと拠点を選んで承認してください。
      </p>
      {users.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
          <UserCheck className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">承認待ちのユーザーはいません</p>
        </div>
      ) : (
        users.map((user) => <PendingUserRow key={user.id} user={user} offices={offices} />)
      )}
    </div>
  );
}
