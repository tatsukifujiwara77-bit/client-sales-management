-- ============================================================
-- クライアント営業管理WEBアプリ RLS（Row Level Security）ポリシー
-- 作成日: 2026-09-06
-- 前提:
--   - ロール: admin(管理者) / office_manager(拠点マネージャー) / sales_rep(営業担当者)
--   - アカウント発行は管理者が手動登録・招待（Supabase Auth経由）
--   - profiles は auth.users 作成時にトリガーで自動生成
--   - 「ログインしているから全部見られる」設計にしない
-- ============================================================

-- ------------------------------------------------------------
-- 0. 全テーブルでRLSを有効化（念のため冪等に再宣言）
-- ------------------------------------------------------------
alter table offices             enable row level security;
alter table profiles            enable row level security;
alter table sales_stages        enable row level security;
alter table loss_reasons        enable row level security;
alter table clients             enable row level security;
alter table client_assignments  enable row level security;
alter table client_contacts     enable row level security;
alter table client_notes        enable row level security;
alter table activities          enable row level security;
alter table action_items        enable row level security;
alter table alerts              enable row level security;
alter table alert_settings      enable row level security;

-- ------------------------------------------------------------
-- 1. ヘルパー関数
--    profiles自体にもRLSがかかるため、再帰を避けるために
--    security definer で作成し、RLSをバイパスして参照する
-- ------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_office_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select office_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'admin';
$$;

-- クライアントを閲覧・編集できるか（admin=全件 / office_manager=自拠点 / sales_rep=担当 or 開拓者）
create or replace function public.can_access_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case public.current_user_role()
    when 'admin' then true
    when 'office_manager' then exists (
      select 1 from public.clients c
      where c.id = p_client_id and c.office_id = public.current_user_office_id()
    )
    else exists (
      select 1 from public.clients c
      where c.id = p_client_id
        and (
          c.discovered_by = auth.uid()
          or exists (
            select 1 from public.client_assignments ca
            where ca.client_id = c.id and ca.user_id = auth.uid()
          )
        )
    )
  end;
$$;

-- ------------------------------------------------------------
-- 2. auth.users 作成時に profiles を自動生成するトリガー
--    (管理者がSupabase Authでユーザーを招待した際に自動実行)
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, '未設定'),
    coalesce(new.raw_user_meta_data ->> 'role', 'sales_rep')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 3. offices（マスタ）: 閲覧は全員、変更は管理者のみ
-- ------------------------------------------------------------
drop policy if exists offices_select_all on offices;
create policy offices_select_all on offices
  for select to authenticated using (true);

drop policy if exists offices_write_admin on offices;
create policy offices_write_admin on offices
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 4. sales_stages / loss_reasons（マスタ）: 閲覧は全員、変更は管理者のみ
-- ------------------------------------------------------------
drop policy if exists sales_stages_select_all on sales_stages;
create policy sales_stages_select_all on sales_stages
  for select to authenticated using (true);
drop policy if exists sales_stages_write_admin on sales_stages;
create policy sales_stages_write_admin on sales_stages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists loss_reasons_select_all on loss_reasons;
create policy loss_reasons_select_all on loss_reasons
  for select to authenticated using (true);
drop policy if exists loss_reasons_write_admin on loss_reasons;
create policy loss_reasons_write_admin on loss_reasons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 5. alert_settings: 閲覧は全員、変更は管理者のみ
-- ------------------------------------------------------------
alter table alert_settings enable row level security;
drop policy if exists alert_settings_select_all on alert_settings;
create policy alert_settings_select_all on alert_settings
  for select to authenticated using (true);
drop policy if exists alert_settings_write_admin on alert_settings;
create policy alert_settings_write_admin on alert_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 6. profiles: 全員閲覧可（社内ディレクトリ的な利用）/ 自分の行のみ更新可 / 管理者は全操作可
-- ------------------------------------------------------------
drop policy if exists profiles_select_all on profiles;
create policy profiles_select_all on profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_all_admin on profiles;
create policy profiles_all_admin on profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 7. clients
-- ------------------------------------------------------------
drop policy if exists clients_select on clients;
create policy clients_select on clients
  for select to authenticated using (public.can_access_client(id));

drop policy if exists clients_insert on clients;
create policy clients_insert on clients
  for insert to authenticated with check (
    public.is_admin()
    or office_id = public.current_user_office_id()
  );

drop policy if exists clients_update on clients;
create policy clients_update on clients
  for update to authenticated
  using (public.can_access_client(id))
  with check (public.is_admin() or office_id = public.current_user_office_id());

drop policy if exists clients_delete_admin on clients;
create policy clients_delete_admin on clients
  for delete to authenticated using (public.is_admin());

-- ------------------------------------------------------------
-- 8. client_assignments（担当割り当ての変更は admin / office_manager のみ）
-- ------------------------------------------------------------
drop policy if exists client_assignments_select on client_assignments;
create policy client_assignments_select on client_assignments
  for select to authenticated using (public.can_access_client(client_id));

drop policy if exists client_assignments_write on client_assignments;
create policy client_assignments_write on client_assignments
  for all to authenticated
  using (
    public.is_admin()
    or (public.current_user_role() = 'office_manager' and public.can_access_client(client_id))
  )
  with check (
    public.is_admin()
    or (public.current_user_role() = 'office_manager' and public.can_access_client(client_id))
  );

-- ------------------------------------------------------------
-- 9. client_contacts / client_notes / activities / action_items
--    閲覧・作成・更新は can_access_client() に準拠。削除は admin / office_manager のみ。
-- ------------------------------------------------------------
drop policy if exists client_contacts_rw on client_contacts;
create policy client_contacts_rw on client_contacts
  for all to authenticated
  using (public.can_access_client(client_id))
  with check (public.can_access_client(client_id));
drop policy if exists client_contacts_delete on client_contacts;
create policy client_contacts_delete on client_contacts
  for delete to authenticated
  using (public.is_admin() or (public.current_user_role() = 'office_manager' and public.can_access_client(client_id)));

drop policy if exists client_notes_rw on client_notes;
create policy client_notes_rw on client_notes
  for all to authenticated
  using (public.can_access_client(client_id))
  with check (public.can_access_client(client_id));

drop policy if exists activities_rw on activities;
create policy activities_rw on activities
  for all to authenticated
  using (public.can_access_client(client_id))
  with check (public.can_access_client(client_id));
drop policy if exists activities_delete on activities;
create policy activities_delete on activities
  for delete to authenticated
  using (public.is_admin() or (public.current_user_role() = 'office_manager' and public.can_access_client(client_id)));

drop policy if exists action_items_rw on action_items;
create policy action_items_rw on action_items
  for all to authenticated
  using (public.can_access_client(client_id))
  with check (public.can_access_client(client_id));

-- ------------------------------------------------------------
-- 10. alerts: 閲覧・ステータス更新（既読/対応済み）のみ authenticated に許可
--     生成(INSERT)はNestJSのバッチが service_role で行うため
--     authenticated 向けの INSERT/DELETE ポリシーは意図的に作らない
-- ------------------------------------------------------------
drop policy if exists alerts_select on alerts;
create policy alerts_select on alerts
  for select to authenticated using (public.can_access_client(client_id));

drop policy if exists alerts_update_status on alerts;
create policy alerts_update_status on alerts
  for update to authenticated
  using (public.can_access_client(client_id))
  with check (public.can_access_client(client_id));
