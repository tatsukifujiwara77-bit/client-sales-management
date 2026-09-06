'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clientFetchApi } from '@/lib/api/client';
import type { AlertStatus } from '@/lib/api/types';

/** アラートの却下・解決操作（PATCH /alerts/:id）。設計書 7.2 のアラート一覧で使う。 */
export function AlertStatusButton({ alertId, status }: { alertId: string; status: Extract<AlertStatus, 'dismissed' | 'resolved'> }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    setIsSubmitting(true);
    try {
      await clientFetchApi(`/alerts/${alertId}`, { method: 'PATCH', body: { status } });
      router.refresh();
    } catch {
      // 失敗時もUIをブロックしない。再試行してもらう。
    } finally {
      setIsSubmitting(false);
    }
  }

  const isResolve = status === 'resolved';

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={isSubmitting}>
      {isSubmitting ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : isResolve ? (
        <Check className="size-3.5" />
      ) : (
        <X className="size-3.5" />
      )}
      {isResolve ? '解決済みにする' : '却下'}
    </Button>
  );
}
