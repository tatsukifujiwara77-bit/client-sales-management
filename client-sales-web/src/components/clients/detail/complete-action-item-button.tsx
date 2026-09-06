'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clientFetchApi } from '@/lib/api/client';

export function CompleteActionItemButton({ clientId, actionItemId }: { clientId: string; actionItemId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleComplete() {
    setIsSubmitting(true);
    try {
      await clientFetchApi(`/clients/${clientId}/action-items/${actionItemId}/complete`, {
        method: 'POST',
        body: {},
      });
      router.refresh();
    } catch {
      // 失敗時もUIをブロックしない。再試行してもらう。
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleComplete} disabled={isSubmitting}>
      {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
      対応済みにする
    </Button>
  );
}
