'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { clientFetchApi } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { SalesStage } from '@/lib/api/types';

function StageRow({ stage }: { stage: SalesStage }) {
  const router = useRouter();
  const [name, setName] = useState(stage.name);
  const [sortOrder, setSortOrder] = useState(stage.sortOrder);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isDirty = name !== stage.name || sortOrder !== stage.sortOrder;

  async function handleSave() {
    setIsSaving(true);
    try {
      await clientFetchApi(`/sales-stages/${stage.id}`, {
        method: 'PATCH',
        body: { name, sortOrder },
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '営業フェーズの更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`「${stage.name}」を削除しますか？このフェーズを使用しているクライアントがいる場合は削除できません。`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await clientFetchApi(`/sales-stages/${stage.id}`, { method: 'DELETE' });
      toast.success(`「${stage.name}」を削除しました`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '営業フェーズの削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-3 py-3">
        <div className="flex min-w-40 flex-1 flex-col gap-1.5">
          <Label htmlFor={`stage-name-${stage.id}`}>フェーズ名</Label>
          <Input id={`stage-name-${stage.id}`} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex w-24 flex-col gap-1.5">
          <Label htmlFor={`stage-order-${stage.id}`}>並び順</Label>
          <Input
            id={`stage-order-${stage.id}`}
            type="number"
            min={1}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
        </div>
        {stage.isClosed ? (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            契約済みフェーズ
          </span>
        ) : null}
        <Button size="sm" onClick={handleSave} disabled={!isDirty || isSaving || isDeleting}>
          {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          保存
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDelete}
          disabled={isSaving || isDeleting}
          className="text-destructive hover:text-destructive"
        >
          {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          削除
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * 営業フェーズ管理（設計書 #24）。
 * 名称・並び順の変更に加え、削除も可能（このフェーズを使用しているクライアントが
 * いる場合はAPI側で409エラーとなり、フロントではその旨をトーストで表示する）。
 * フェーズの新規作成はこの画面からは提供しない。
 * admin以外は保存・削除時にAPI側（RLS）で弾かれる想定。
 */
export function SalesStagesSettings({ stages }: { stages: SalesStage[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        営業フェーズの名称・並び順を変更できます。使用されていないフェーズはこの画面から削除できます。
      </p>
      {stages.map((stage) => (
        <StageRow key={stage.id} stage={stage} />
      ))}
    </div>
  );
}
