import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

/** 画面実装前の一時的なプレースホルダー（フロントエンド基盤フェーズ用） */
export function ScreenPlaceholder({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-6" />
        </div>
        <p className="text-sm font-medium text-foreground">{label}画面は準備中です</p>
        <p className="text-xs text-muted-foreground">この画面は次のステップで実装します</p>
      </CardContent>
    </Card>
  );
}
