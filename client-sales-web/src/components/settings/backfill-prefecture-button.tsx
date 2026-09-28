'use client';

import { useState } from 'react';
import { Loader2, MapPinned } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { clientFetchApi } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';

/**
 * 所在地はあるが都道府県が未設定の既存クライアントを、まとめて住所から判定して埋める
 * (管理者限定、POST /clients/backfill-prefecture)。都道府県カラム追加前に登録されていた
 * クライアントを、1件ずつ編集・保存し直さなくても一括で反映できるようにする。
 */
export function BackfillPrefectureButton() {
  const [isRunning, setIsRunning] = useState(false);

  async function handleClick() {
    setIsRunning(true);
    try {
      const result = await clientFetchApi<{ clientsChecked: number; clientsUpdated: number }>(
        '/clients/backfill-prefecture',
        { method: 'POST' },
      );
      if (result.clientsChecked === 0) {
        toast.success('都道府県が未設定のクライアントはありませんでした');
      } else {
        toast.success(
          `${result.clientsChecked}件中${result.clientsUpdated}件の都道府県を更新しました` +
            (result.clientsUpdated < result.clientsChecked
              ? '(住所から判定できなかった一部のクライアントは未反映です)'
              : ''),
        );
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '都道府県の一括更新に失敗しました');
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={isRunning}>
      {isRunning ? <Loader2 className="size-3.5 animate-spin" /> : <MapPinned className="size-3.5" />}
      都道府県を一括更新
    </Button>
  );
}
