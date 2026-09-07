'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Plus, Save, Star, Trash2, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { clientFetchApi } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { ClientContact } from '@/lib/api/types';

interface ContactFormValues {
  name: string;
  position: string;
  department: string;
  phone: string;
  email: string;
  isKeyPerson: boolean;
  notes: string;
}

const EMPTY_VALUES: ContactFormValues = {
  name: '',
  position: '',
  department: '',
  phone: '',
  email: '',
  isKeyPerson: false,
  notes: '',
};

function toFormValues(contact: ClientContact): ContactFormValues {
  return {
    name: contact.name,
    position: contact.position ?? '',
    department: contact.department ?? '',
    phone: contact.phone ?? '',
    email: contact.email ?? '',
    isKeyPerson: contact.isKeyPerson,
    notes: contact.notes ?? '',
  };
}

function ContactFields({
  idPrefix,
  values,
  onChange,
}: {
  idPrefix: string;
  values: ContactFormValues;
  onChange: <K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-name`}>氏名</Label>
          <Input
            id={`${idPrefix}-name`}
            value={values.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="例: 髙江洲 様"
            maxLength={200}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-department`}>部署</Label>
          <Input
            id={`${idPrefix}-department`}
            value={values.department}
            onChange={(e) => onChange('department', e.target.value)}
            placeholder="例: 人事部"
            maxLength={100}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-position`}>役職</Label>
          <Input
            id={`${idPrefix}-position`}
            value={values.position}
            onChange={(e) => onChange('position', e.target.value)}
            placeholder="例: 部長"
            maxLength={100}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-phone`}>電話番号</Label>
          <Input
            id={`${idPrefix}-phone`}
            value={values.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="例: 090-1234-5678"
            maxLength={50}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-email`}>メールアドレス</Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          value={values.email}
          onChange={(e) => onChange('email', e.target.value)}
          placeholder="example@example.com"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-notes`}>メモ</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          value={values.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder="この方についてのメモ"
          rows={2}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={values.isKeyPerson}
          onChange={(e) => onChange('isKeyPerson', e.target.checked)}
          className="size-4 rounded border-input accent-warning"
        />
        キーパーソンとしてマークする
      </label>
    </div>
  );
}

function ContactCard({ clientId, contact }: { clientId: string; contact: ClientContact }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState<ContactFormValues>(toFormValues(contact));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function update<K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!values.name.trim()) {
      toast.error('氏名を入力してください');
      return;
    }
    setIsSaving(true);
    try {
      await clientFetchApi(`/clients/${clientId}/contacts/${contact.id}`, {
        method: 'PATCH',
        body: {
          name: values.name.trim(),
          position: values.position.trim() || undefined,
          department: values.department.trim() || undefined,
          phone: values.phone.trim() || undefined,
          email: values.email.trim() || undefined,
          isKeyPerson: values.isKeyPerson,
          notes: values.notes.trim() || undefined,
        },
      });
      toast.success('連絡先を更新しました');
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`${contact.name} を削除しますか？この操作は取り消せません。`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await clientFetchApi(`/clients/${clientId}/contacts/${contact.id}`, { method: 'DELETE' });
      toast.success('連絡先を削除しました');
      router.refresh();
    } catch (error) {
      // 削除は管理者/拠点マネージャー限定(RLS)のため、権限のないユーザーはここでエラーになる。
      toast.error(error instanceof ApiError ? error.message : '削除に失敗しました');
      setIsDeleting(false);
    }
  }

  if (isEditing) {
    return (
      <div className="space-y-3 rounded-md border border-border p-3 sm:col-span-2">
        <ContactFields idPrefix={`contact-${contact.id}`} values={values} onChange={update} />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
            <X className="size-3.5" />
            キャンセル
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            保存
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-md border border-border p-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <User className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-sm font-medium text-foreground">
          {contact.name}
          {contact.isKeyPerson ? <Star className="size-3.5 fill-warning text-warning" /> : null}
        </p>
        <p className="text-xs text-muted-foreground">
          {[contact.department, contact.position].filter(Boolean).join(' / ') || '—'}
        </p>
        {contact.phone ? <p className="text-xs text-muted-foreground">{contact.phone}</p> : null}
        {contact.email ? <p className="text-xs text-muted-foreground">{contact.email}</p> : null}
        {contact.notes ? <p className="mt-1 text-xs whitespace-pre-wrap text-foreground">{contact.notes}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="icon-sm" variant="ghost" onClick={() => setIsEditing(true)} aria-label="編集">
          <Pencil className="size-3.5" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-destructive hover:text-destructive"
          aria-label="削除"
        >
          {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function NewContactForm({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const router = useRouter();
  const [values, setValues] = useState<ContactFormValues>(EMPTY_VALUES);
  const [isSaving, setIsSaving] = useState(false);

  function update<K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!values.name.trim()) {
      toast.error('氏名を入力してください');
      return;
    }
    setIsSaving(true);
    try {
      await clientFetchApi(`/clients/${clientId}/contacts`, {
        method: 'POST',
        body: {
          name: values.name.trim(),
          position: values.position.trim() || undefined,
          department: values.department.trim() || undefined,
          phone: values.phone.trim() || undefined,
          email: values.email.trim() || undefined,
          isKeyPerson: values.isKeyPerson,
          notes: values.notes.trim() || undefined,
        },
      });
      toast.success('連絡先を登録しました');
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '登録に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-dashed border-border p-3 sm:col-span-2">
      <ContactFields idPrefix="contact-new" values={values} onChange={update} />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onClose} disabled={isSaving}>
          キャンセル
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          登録する
        </Button>
      </div>
    </div>
  );
}

/**
 * 重要人物(client_contacts)の一覧・追加・編集・削除。
 * 削除はRLS(client_contacts_delete)によりadmin/office_manager限定のため、
 * 権限のないユーザーが押した場合はAPI側のエラーをトーストで表示する
 * (活動記録の削除と同じ方針)。
 */
export function ContactsSection({ clientId, contacts }: { clientId: string; contacts: ClientContact[] }) {
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {!isCreating ? (
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <Plus className="size-4" />
            連絡先を追加
          </Button>
        ) : null}
      </div>

      {contacts.length === 0 && !isCreating ? (
        <p className="py-4 text-center text-sm text-muted-foreground">登録された連絡先はありません</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {isCreating ? <NewContactForm clientId={clientId} onClose={() => setIsCreating(false)} /> : null}
          {contacts.map((contact) => (
            <ContactCard key={contact.id} clientId={clientId} contact={contact} />
          ))}
        </div>
      )}
    </div>
  );
}
