'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { clientFetchApi } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { Industry } from '@/lib/api/types';

function IndustryRow({ industry }: { industry: Industry }) {
  const router = useRouter();
  const [name, setName] = useState(industry.name);
  const [sortOrder, setSortOrder] = useState(industry.sortOrder);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isDirty = name !== industry.name || sortOrder !== industry.sortOrder;
  const isInUse = industry.clientCount > 0;

  async function handleSave() {
    setIsSaving(true);
    try {
      await clientFetchApi(`/industries/${industry.id}`, {
        method: 'PATCH',
        body: { name, sortOrder },
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '業種の更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (isInUse) return;
    if (!window.confirm(`「${industry.name}」を削除しますか？`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await clientFetchApi(`/industries/${industry.id}`, { method: 'DELETE' });
      toast.success(`「${industry.name}」を削除しました`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '業種の削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-3 py-3">
        <div className="flex min-w-40 flex-1 flex-col gap-1.5">
          <Label htmlFor={`industry-name-${industry.id}`}>業種名</Label>
          <Input id={`industry-name-${industry.id}`} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex w-24 flex-col gap-1.5">
          <Label htmlFor={`industry-order-${industry.id}`}>並び順</Label>
          <Input
            id={`industry-order-${industry.id}`}
            type="number"
            min={1}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          使用中: {industry.clientCount}件
        </span>
        <Button size="sm" onClick={handleSave} disabled={!isDirty || isSaving || isDeleting}>
          {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          保存
        </Button>
        {isInUse ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDelete}
                  aria-disabled
                  className="cursor-not-allowed text-muted-foreground"
                />
              }
            >
              <Trash2 className="size-3.5" />
              削除
            </TooltipTrigger>
            <TooltipContent>この業種を使用しているクライアントがいるため削除できません</TooltipContent>
          </Tooltip>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}

function CreateIndustryRow() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      toast.error('業種名を入力してください');
      return;
    }
    setIsCreating(true);
    try {
      await clientFetchApi('/industries', { method: 'POST', body: { name: name.trim() } });
      toast.success(`「${name.trim()}」を追加しました`);
      setName('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '業種の追加に失敗しました');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-wrap items-end gap-3 py-3">
        <div className="flex min-w-40 flex-1 flex-col gap-1.5">
          <Label htmlFor="new-industry-name">新しい業種を追加</Label>
          <Input
            id="new-industry-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 教育"
          />
        </div>
        <Button size="sm" onClick={handleCreate} disabled={isCreating}>
          {isCreating ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          追加
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * 業種管理（設定画面）。営業フェーズ管理と同じ操作感(名称変更・並び順・保存・削除)に加え、
 * 業種は将来的に増減しうるマスタのため新規作成にも対応する。
 * 使用中(client_industriesから参照されている)の業種は削除不可(API側でも23503→409に変換)。
 * admin以外は保存・削除・作成時にAPI側（RLS）で弾かれる想定。
 */
export function IndustriesSettings({ industries }: { industries: Industry[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        業種の名称・並び順を変更できます。使用されていない業種はこの画面から削除できます。
      </p>
      {industries.map((industry) => (
        <IndustryRow key={industry.id} industry={industry} />
      ))}
      <CreateIndustryRow />
    </div>
  );
}
