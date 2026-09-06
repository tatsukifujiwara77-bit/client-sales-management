'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background p-6 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <p className="text-sm font-medium text-foreground">データの読み込みに失敗しました</p>
      <p className="max-w-sm text-xs text-muted-foreground">{error.message}</p>
      <Button onClick={reset} variant="outline" size="sm">
        再読み込み
      </Button>
    </div>
  );
}
