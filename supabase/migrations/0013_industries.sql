-- ============================================================
-- 業種マスタ（クライアントに複数付与できる業種タグ）
-- ============================================================
create table industries (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_industries_updated_at before update on industries
  for each row execute function set_updated_at();

insert into industries (name, sort_order) values
  ('製造', 1),
  ('物流・倉庫', 2),
  ('小売・流通', 3),
  ('飲食', 4),
  ('介護・医療', 5),
  ('建設', 6),
  ('IT・通信', 7),
  ('サービス', 8),
  ('その他', 9);

alter table industries enable row level security;

-- 閲覧は全員、変更(作成・並び替え・削除)は管理者のみ（sales_stages/loss_reasonsと同じ方針）
drop policy if exists industries_select_all on industries;
create policy industries_select_all on industries
  for select to authenticated using (true);
drop policy if exists industries_write_admin on industries;
create policy industries_write_admin on industries
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
