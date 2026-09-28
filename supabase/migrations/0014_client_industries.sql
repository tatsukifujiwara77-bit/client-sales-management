-- ============================================================
-- client_industries（クライアントと業種の紐付け：複数業種対応、主業種フラグ付き）
-- client_assignments（複数担当営業対応）と同じ設計方針:
--   - unique (client_id, industry_id) で同じ業種の重複付与を防ぐ
--   - is_primary の部分ユニークインデックスで「主業種は必ず1件」をDBで保証する
-- ============================================================
create table client_industries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  industry_id uuid not null references industries(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (client_id, industry_id)
);
create index idx_client_industries_client_id on client_industries(client_id);
create index idx_client_industries_industry_id on client_industries(industry_id);
create unique index uidx_client_industries_primary
  on client_industries(client_id) where (is_primary);

alter table client_industries enable row level security;

-- 業種タグは特徴・注意事項と同様の付随情報のため、client_contactsと同じ方針にする:
-- 閲覧はcan_access_client()を満たす全員(実運用上は0010でclients関連が全員に開放されているのと揃える)、
-- 書き込みも担当者アサインのような管理者/拠点マネージャー限定にはしない。
drop policy if exists client_industries_select_all on client_industries;
create policy client_industries_select_all on client_industries
  for select to authenticated using (true);
drop policy if exists client_industries_rw on client_industries;
create policy client_industries_rw on client_industries
  for all to authenticated
  using (public.can_access_client(client_id))
  with check (public.can_access_client(client_id));
