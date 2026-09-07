'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { clientFetchApi } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';

/**
 * アラートの手動再計算(管理者限定, POST /alerts/recompute)。
 * 通常は次回アクションの作成/更新時、および毎時のcronで自動的に再計算されるが、
 * SUPABASE_SERVICE_ROLE_KEY未設定の環境ではその自動再計算が黙ってスキップされるため、
 * 設定を直した直後に既存データへ即座に反映させたい場合などに使う。
 */
export function RecomputeAlertsButton() {
  const router = useRouter();
  const [isRecomputing, setIsRecomputing] = useState(false);

  async function handleClick() {
    setIsRecomputing(true);
    try {
      const result = await clientFetchApi<{ clientsProcessed: number }>('/alerts/recompute', { method: 'POST' });
      toast.success(`${result.clientsProcessed}件のクライアント分を再計算しました`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '再計算に失敗しました');
    } finally {
      setIsRecomputing(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={isRecomputing}>
      {isRecomputing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
      アラートを今すぐ再計算
    </Button>
  );
}
