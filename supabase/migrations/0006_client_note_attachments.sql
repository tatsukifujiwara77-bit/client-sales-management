-- ------------------------------------------------------------
-- 常設メモへのファイル添付機能
-- ------------------------------------------------------------
-- client_notes 1件に対して複数のファイルを添付できるようにする。
-- ファイル実体は Supabase Storage の private バケット(client-attachments)に置き、
-- このテーブルにはメタデータ(パス・ファイル名・サイズ等)のみを保持する。
-- client_id はRLS判定・ストレージパスの検証を簡潔にするための非正規化列
-- （client_notes.client_id と常に一致させる。挿入はNestJS側で両方セットする）。

create table client_note_attachments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references client_notes(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null
);

create index idx_client_note_attachments_note_id on client_note_attachments(note_id);
create index idx_client_note_attachments_client_id on client_note_attachments(client_id);

alter table client_note_attachments enable row level security;

-- client_notes と同様、クライアントにアクセスできるユーザーは
-- そのクライアントの添付ファイルメタデータも読み書き・削除できる。
drop policy if exists client_note_attachments_rw on client_note_attachments;
create policy client_note_attachments_rw on client_note_attachments
  for all to authenticated
  using (public.can_access_client(client_id))
  with check (public.can_access_client(client_id));

-- ------------------------------------------------------------
-- Storage: client-attachments バケット（非公開）
-- パス規約: {client_id}/{note_id}/{uuid}-{file_name}
-- 先頭セグメント(client_id)を can_access_client() でチェックすることで
-- テーブルのRLSと同じアクセス制御をストレージにも適用する。
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('client-attachments', 'client-attachments', false)
on conflict (id) do nothing;

drop policy if exists client_attachments_storage_rw on storage.objects;
create policy client_attachments_storage_rw on storage.objects
  for all to authenticated
  using (
    bucket_id = 'client-attachments'
    and public.can_access_client(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'client-attachments'
    and public.can_access_client(((storage.foldername(name))[1])::uuid)
  );
