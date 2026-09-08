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
import type { ClientDetail, Office, SalesStage, Temperature, UserSummary } from '@/lib/api/types';

const TEMPERATURE_VALUES: Temperature[] = ['high', 'medium', 'low', 'unknown'];
const NO_ASSIGNEE_VALUE = '__unassigned__';

interface ClientFormValues {
  companyName: string;
  websiteUrl: string;
  officeId: string;
  salesStageId: string;
  assigneeId: string;
  temperature: Temperature;
  address: string;
  lat: string;
  lng: string;
  characteristics: string;
  cautionNotes: string;
}

function toFormValues(client: ClientDetail | null): ClientFormValues {
  return {
    companyName: client?.companyName ?? '',
    websiteUrl: client?.websiteUrl ?? '',
    officeId: client?.office?.id ?? '',
    salesStageId: client?.salesStage.id ?? '',
    assigneeId: client?.primaryAssignee?.id ?? NO_ASSIGNEE_VALUE,
    temperature: client?.temperature ?? 'unknown',
    address: client?.address ?? '',
    lat: client?.lat != null ? String(client.lat) : '',
    lng: client?.lng != null ? String(client.lng) : '',
    characteristics: client?.characteristics ?? '',
    cautionNotes: client?.cautionNotes ?? '',
  };
}

interface ClientFormProps {
  offices: Office[];
  salesStages: SalesStage[];
  users: UserSummary[];
  /** 編集時は既存のクライアント、新規登録時はnull */
  client?: ClientDetail | null;
  /**
   * 保存後の遷移先の基準パス(営業リストでは/sales-list、クライアントでは/clients)。
   * ただし選択した営業フェーズが契約終了(isClosed)の場合は、basePathに関わらず
   * 常に/clientsへ遷移する(営業リスト→クライアントへの「卒業」を自動で反映するため)。
   */
  basePath?: string;
}

/**
 * クライアントの新規登録・編集フォーム（共通コンポーネント）。
 * 緯度経度・開拓者・失注理由は設計上任意項目のためv1のフォームからは省略している
 * （必要になったら詳細画面から個別に編集できるようにする）。
 *
 * 担当営業(担当割り当て)はclients本体のカラムではなくclient_assignments経由の別APIのため、
 * 会社名等の通常フィールドとは別に、クライアント保存が成功した後に続けて
 * assign/unassignを呼ぶ形で反映する(新規登録時は作成直後のidを使って割り当てる)。
 */
export function ClientForm({ offices, salesStages, users, client = null, basePath = '/clients' }: ClientFormProps) {
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
  const assigneeItems = [
    { value: NO_ASSIGNEE_VALUE, label: '未割当' },
    ...users.map((u) => ({ value: u.id, label: u.fullName })),
  ];

  /** 担当営業の割り当てをclient_assignments APIへ反映する(変更があった場合のみ)。 */
  async function syncAssignee(clientId: string) {
    const previousAssigneeId = client?.primaryAssignee?.id ?? null;
    const nextAssigneeId = values.assigneeId === NO_ASSIGNEE_VALUE ? null : values.assigneeId;
    if (previousAssigneeId === nextAssigneeId) {
      return;
    }

    if (nextAssigneeId) {
      await clientFetchApi(`/clients/${clientId}/assignments`, {
        method: 'POST',
        body: { userId: nextAssigneeId, isPrimary: true },
      });
    } else if (previousAssigneeId) {
      await clientFetchApi(`/clients/${clientId}/assignments/${previousAssigneeId}`, { method: 'DELETE' });
    }
  }

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
    const lat = values.lat.trim() ? Number(values.lat) : undefined;
    const lng = values.lng.trim() ? Number(values.lng) : undefined;
    if ((lat !== undefined && Number.isNaN(lat)) || (lng !== undefined && Number.isNaN(lng))) {
      toast.error('緯度・経度は数値で入力してください');
      return;
    }

    setIsSaving(true);
    try {
      const body = {
        companyName: values.companyName.trim(),
        websiteUrl: values.websiteUrl.trim() || undefined,
        officeId: values.officeId,
        salesStageId: values.salesStageId,
        temperature: values.temperature,
        address: values.address.trim() || undefined,
        lat,
        lng,
        characteristics: values.characteristics.trim() || undefined,
        cautionNotes: values.cautionNotes.trim() || undefined,
      };

      const clientId = isEditing
        ? client.id
        : (await clientFetchApi<{ id: string }>('/clients', { method: 'POST', body })).id;
      if (isEditing) {
        await clientFetchApi(`/clients/${clientId}`, { method: 'PATCH', body });
      }

      try {
        await syncAssignee(clientId);
      } catch (assigneeError) {
        toast.error(
          assigneeError instanceof ApiError
            ? `クライアント情報は保存されましたが、担当営業の更新に失敗しました: ${assigneeError.message}`
            : 'クライアント情報は保存されましたが、担当営業の更新に失敗しました',
        );
      }

      toast.success(isEditing ? 'クライアント情報を更新しました' : 'クライアントを登録しました');
      // 選択した営業フェーズが契約終了(isClosed)なら、basePathに関わらず/clientsへ
      // (営業リストからクライアントへの「卒業」を、保存と同時に自動で反映する)。
      const selectedStage = salesStages.find((s) => s.id === values.salesStageId);
      const destinationBasePath = selectedStage?.isClosed ? '/clients' : basePath;
      router.push(`${destinationBasePath}/${clientId}`);
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="websiteUrl">ホームページURL</Label>
        <Input
          id="websiteUrl"
          type="url"
          value={values.websiteUrl}
          onChange={(e) => update('websiteUrl', e.target.value)}
          placeholder="https://example.co.jp"
          maxLength={500}
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
          <Label>担当営業</Label>
          <Select
            items={assigneeItems}
            value={values.assigneeId}
            onValueChange={(v) => update('assigneeId', v ?? NO_ASSIGNEE_VALUE)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assigneeItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lat">緯度（地図表示用・通常は空欄でOK）</Label>
          <Input
            id="lat"
            type="number"
            step="any"
            value={values.lat}
            onChange={(e) => update('lat', e.target.value)}
            placeholder="例: 33.590200"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lng">経度（地図表示用・通常は空欄でOK）</Label>
          <Input
            id="lng"
            type="number"
            step="any"
            value={values.lng}
            onChange={(e) => update('lng', e.target.value)}
            placeholder="例: 130.401700"
          />
        </div>
        <p className="sm:col-span-2 text-xs text-muted-foreground">
          所在地を入力して保存すると、自動で座標を調べて地図に反映します（国土地理院の住所検索を利用）。ピンの位置がずれる場合や、より正確な位置を指定したい場合のみ、ここに座標を直接入力してください（入力した場合はそちらが優先されます）。
        </p>
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
