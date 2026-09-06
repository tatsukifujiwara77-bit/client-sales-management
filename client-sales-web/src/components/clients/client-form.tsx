'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { clientFetchApi } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { TEMPERATURE_LABELS } from '@/lib/domain-labels';
import type { ClientDetail, Office, SalesStage, Temperature } from '@/lib/api/types';

const TEMPERATURE_VALUES: Temperature[] = ['high', 'medium', 'low', 'unknown'];

interface ClientFormValues {
  companyName: string;
  officeId: string;
  salesStageId: string;
  temperature: Temperature;
  address: string;
  characteristics: string;
  cautionNotes: string;
}

function toFormValues(client: ClientDetail | null): ClientFormValues {
  return {
    companyName: client?.companyName ?? '',
    officeId: client?.office?.id ?? '',
    salesStageId: client?.salesStage.id ?? '',
    temperature: client?.temperature ?? 'unknown',
    address: client?.address ?? '',
    characteristics: client?.characteristics ?? '',
    cautionNotes: client?.cautionNotes ?? '',
  };
}

interface ClientFormProps {
  offices: Office[];
  salesStages: SalesStage[];
  /** 編集時は既存のクライアント、新規登録時はnull */
  client?: ClientDetail | null;
}

/**
 * クライアントの新規登録・編集フォーム（共通コンポーネント）。
 * 緯度経度・開拓者・失注理由は設計上任意項目のためv1のフォームからは省略している
 * （必要になったら詳細画面から個別に編集できるようにする）。
 */
export function ClientForm({ offices, salesStages, client = null }: ClientFormProps) {
  const router = useRouter();
  const isEditing = client !== null;
  const [values, setValues] = useState<ClientFormValues>(toFormValues(client));
  const [isSaving, setIsSaving] = useState(false);

  function update<K extends keyof ClientFormValues>(key: K, value: ClientFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  // Base UIのSelectは`items`を渡さないと<SelectValue>が生の value(UUID等)をそのまま表示してしまうため、
  // value/labelのマッピングを明示的に用意する(clients-filter-bar.tsxと同じ対応)。
  const officeItems = offices.map((o) => ({ value: o.id, label: o.name }));
  const stageItems = salesStages.map((s) => ({ value: s.id, label: s.name }));
  const temperatureItems = TEMPERATURE_VALUES.map((t) => ({ value: t, label: TEMPERATURE_LABELS[t] }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!values.companyName.trim()) {
      toast.error('会社名を入力してください');
      return;
    }
    if (!values.officeId) {
      toast.error('拠点を選択してください');
      return;
    }
    if (!values.salesStageId) {
      toast.error('営業フェーズを選択してください');
      return;
    }

    setIsSaving(true);
    try {
      const body = {
        companyName: values.companyName.trim(),
        officeId: values.officeId,
        salesStageId: values.salesStageId,
        temperature: values.temperature,
        address: values.address.trim() || undefined,
        characteristics: values.characteristics.trim() || undefined,
        cautionNotes: values.cautionNotes.trim() || undefined,
      };

      if (isEditing) {
        await clientFetchApi(`/clients/${client.id}`, { method: 'PATCH', body });
        toast.success('クライアント情報を更新しました');
        router.push(`/clients/${client.id}`);
      } else {
        const created = await clientFetchApi<{ id: string }>('/clients', { method: 'POST', body });
        toast.success('クライアントを登録しました');
        router.push(`/clients/${created.id}`);
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="companyName">会社名</Label>
        <Input
          id="companyName"
          value={values.companyName}
          onChange={(e) => update('companyName', e.target.value)}
          placeholder="株式会社〇〇"
          maxLength={200}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>拠点</Label>
          <Select
            items={officeItems}
            value={values.officeId}
            onValueChange={(v) => update('officeId', v ?? '')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              {offices.map((office) => (
                <SelectItem key={office.id} value={office.id}>
                  {office.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>営業フェーズ</Label>
          <Select
            items={stageItems}
            value={values.salesStageId}
            onValueChange={(v) => update('salesStageId', v ?? '')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              {salesStages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>温度感</Label>
          <Select
            items={temperatureItems}
            value={values.temperature}
            onValueChange={(v) => update('temperature', (v as Temperature) ?? 'unknown')}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPERATURE_VALUES.map((t) => (
                <SelectItem key={t} value={t}>
                  {TEMPERATURE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="address">所在地</Label>
          <Input
            id="address"
            value={values.address}
            onChange={(e) => update('address', e.target.value)}
            placeholder="東京都〇〇区..."
            maxLength={500}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="characteristics">特徴・メモ</Label>
        <Textarea
          id="characteristics"
          value={values.characteristics}
          onChange={(e) => update('characteristics', e.target.value)}
          placeholder="顧客の特徴など"
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cautionNotes">注意事項</Label>
        <Textarea
          id="cautionNotes"
          value={values.cautionNotes}
          onChange={(e) => update('cautionNotes', e.target.value)}
          placeholder="対応時に気をつけること"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSaving}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          {isEditing ? '更新する' : '登録する'}
        </Button>
      </div>
    </form>
  );
}
