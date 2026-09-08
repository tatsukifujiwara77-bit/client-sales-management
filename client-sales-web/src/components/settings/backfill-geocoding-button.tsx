'use client';

import { useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { clientFetchApi } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';

/**
 * 所在地はあるが緯度経度が未設定の既存クライアントを、まとめてジオコーディングする
 * (管理者限定、POST /clients/backfill-geocoding)。自動ジオコーディング導入前に
 * 登録されていたクライアントを、1件ずつ編集・保存し直さなくても一括で反映できるようにする。
 */
export function BackfillGeocodingButton() {
  const [isRunning, setIsRunning] = useState(false);

  async function handleClick() {
    setIsRunning(true);
    try {
      const result = await clientFetchApi<{ clientsChecked: number; clientsUpdated: number }>(
        '/clients/backfill-geocoding',
        { method: 'POST' },
      );
      if (result.clientsChecked === 0) {
        toast.success('座標が未設定のクライアントはありませんでした');
      } else {
        toast.success(
          `${result.clientsChecked}件中${result.clientsUpdated}件の座標を更新しました` +
            (result.clientsUpdated < result.clientsChecked
              ? '(住所が見つからなかった一部のクライアントは未反映です)'
              : ''),
        );
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '座標の一括更新に失敗しました');
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={isRunning}>
      {isRunning ? <Loader2 className="size-3.5 animate-spin" /> : <MapPin className="size-3.5" />}
      座標を一括更新
    </Button>
  );
}
