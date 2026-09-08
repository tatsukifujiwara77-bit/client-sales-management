'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { clientFetchApi } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';

/** クライアント詳細ヘッダーの編集・削除ボタン（削除はRLS上adminのみ実行可能）。 */
export function ClientDetailActions({
  clientId,
  companyName,
  basePath = '/clients',
}: {
  clientId: string;
  companyName: string;
  basePath?: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`${companyName} を削除しますか？関連する活動・アラート等もすべて削除され、この操作は取り消せません。`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await clientFetchApi(`/clients/${clientId}`, { method: 'DELETE' });
      toast.success(`${companyName} を削除しました`);
      router.push(basePath);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '削除に失敗しました');
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`${basePath}/${clientId}/edit`} />}>
        <Pencil className="size-3.5" />
        編集
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleDelete}
        disabled={isDeleting}
        className="text-destructive hover:text-destructive"
      >
        {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        削除
      </Button>
    </div>
  );
}
