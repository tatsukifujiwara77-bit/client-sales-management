'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { clientFetchApi } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { AlertSetting } from '@/lib/api/types';

function SettingRow({ setting }: { setting: AlertSetting }) {
  const router = useRouter();
  const [value, setValue] = useState(setting.value);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = value !== setting.value;

  async function handleSave() {
    setIsSaving(true);
    try {
      await clientFetchApi(`/alert-settings/${setting.key}`, {
        method: 'PATCH',
        body: { value },
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '設定の更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-3 py-3">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <Label htmlFor={`setting-${setting.key}`}>{setting.description ?? setting.key}</Label>
          <Input id={`setting-${setting.key}`} value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <Button size="sm" onClick={handleSave} disabled={!isDirty || isSaving}>
          {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          保存
        </Button>
      </CardContent>
    </Card>
  );
}

/** アラート設定（設計書 #25）。しきい値等の設定値を編集する。 */
export function AlertSettingsForm({ settings }: { settings: AlertSetting[] }) {
  return (
    <div className="space-y-2">
      {settings.map((setting) => (
        <SettingRow key={setting.key} setting={setting} />
      ))}
    </div>
  );
}
