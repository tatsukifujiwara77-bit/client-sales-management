-- ============================================================
-- クライアント営業管理WEBアプリ 初期スキーマ
-- 作成日: 2026-09-06
-- 前提: Supabase (PostgreSQL) / Supabase Auth を利用
-- 方針:
--   - ロール: admin(管理者) / office_manager(拠点マネージャー) / sales_rep(営業担当者)
--   - 1クライアントに複数の担当営業を設定可能（client_assignmentsで管理）
--   - 作成/更新日時・作成者/更新者などの監査情報を可能な限り保持
--   - 案件管理（求人案件・候補者・充足状況）は本アプリの対象外
-- ============================================================

create extension if not exists pgcrypto;

-- 共通: updated_at 自動更新トリガー関数
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- 1. offices（拠点マスタ）
-- ============================================================
create table offices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  prefecture text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
create trigger trg_offices_updated_at before update on offices
  for each row execute function set_updated_at();

-- ============================================================
-- 2. profiles（ユーザー。auth.users を拡張）
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin','office_manager','sales_rep')) default 'sales_rep',
  office_id uuid references offices(id) on delete set null,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create index idx_profiles_office_id on profiles(office_id);

-- offices.created_by / updated_by の外部キーは profiles 作成後に追加
alter table offices
  add constraint fk_offices_created_by foreign key (created_by) references profiles(id) on delete set null,
  add constraint fk_offices_updated_by foreign key (updated_by) references profiles(id) on delete set null;

-- ============================================================
-- 3. sales_stages（営業フェーズマスタ）
--    「案件の進捗」ではなく「クライアントとの営業関係の進捗」
-- ============================================================
create table sales_stages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null,
  is_closed boolean not null default false, -- 「営業終了」フェーズかどうか
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_sales_stages_updated_at before update on sales_stages
  for each row execute function set_updated_at();

insert into sales_stages (name, sort_order, is_closed) values
  ('未接触', 1, false),
  ('アプローチ', 2, false),
  ('担当者接触', 3, false),
  ('商談', 4, false),
  ('提案・交渉', 5, false),
  ('契約・取引中', 6, false),
  ('営業終了', 7, true);

-- ============================================================
-- 4. loss_reasons（営業終了・失注理由マスタ）
-- ============================================================
create table loss_reasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_loss_reasons_updated_at before update on loss_reasons
  for each row execute function set_updated_at();

-- ============================================================
-- 5. clients（クライアント企業。※求人案件・候補者情報は持たない）
-- ============================================================
create table clients (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  office_id uuid references offices(id) on delete set null, -- 担当拠点
  discovered_by uuid references profiles(id) on delete set null, -- 開拓者
  sales_stage_id uuid not null references sales_stages(id),
  temperature text not null check (temperature in ('high','medium','low','unknown')) default 'unknown',
  address text,
  lat numeric(9,6),
  lng numeric(9,6),
  characteristics text,      -- クライアントの特徴
  caution_notes text,        -- 注意事項
  loss_reason_id uuid references loss_reasons(id),
  -- パフォーマンスのためのキャッシュ列（activities から集計して更新する）
  last_visited_at date,      -- 最終訪問日
  last_activity_at date,     -- 最終活動日
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null,
  updated_by uuid references profiles(id) on delete set null
);
create trigger trg_clients_updated_at before update on clients
  for each row execute function set_updated_at();
create index idx_clients_office_id on clients(office_id);
create index idx_clients_sales_stage_id on clients(sales_stage_id);
create index idx_clients_last_visited_at on clients(last_visited_at);

-- ============================================================
-- 6. client_assignments（クライアントと担当営業の紐付け：複数担当対応）
-- ============================================================
create table client_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  is_primary boolean not null default false, -- カルテ等で先頭に表示するメイン担当
  assigned_at timestamptz not null default now(),
  unique (client_id, user_id)
);
create index idx_client_assignments_client_id on client_assignments(client_id);
create index idx_client_assignments_user_id on client_assignments(user_id);
-- 1クライアントにつき is_primary=true は1件のみ
create unique index uidx_client_assignments_primary
  on client_assignments(client_id) where (is_primary);

-- ============================================================
-- 7. client_contacts（クライアントの重要人物・担当者連絡先）
-- ============================================================
create table client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  position text,     -- 役職
  department text,
  phone text,
  email text,
  is_key_person boolean not null default false, -- 重要人物フラグ
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null,
  updated_by uuid references profiles(id) on delete set null
);
create trigger trg_client_contacts_updated_at before update on client_contacts
  for each row execute function set_updated_at();
create index idx_client_contacts_client_id on client_contacts(client_id);

-- ============================================================
-- 8. client_notes（常設メモ：クライアントについて常に知っておくべきこと）
--    ※商談ごとのメモ(activities.notes)とは明確に区別する
-- ============================================================
create table client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null,
  updated_by uuid references profiles(id) on delete set null
);
create trigger trg_client_notes_updated_at before update on client_notes
  for each row execute function set_updated_at();
create index idx_client_notes_client_id on client_notes(client_id);

-- ============================================================
-- 9. activities（営業活動履歴：訪問・商談・電話・メール・オンライン・その他）
-- ============================================================
create table activities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  activity_type text not null check (activity_type in ('visit','meeting','call','email','online','other')),
  activity_date date not null,
  owner_id uuid not null references profiles(id), -- 実施した担当者
  participants text, -- 参加者（自由記述。例:「南国殖産:髙江洲様/当社:藤原」等）
  notes text,        -- 商談メモ（長文・見出し/箇条書き可のリッチテキストを想定）
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null,
  updated_by uuid references profiles(id) on delete set null
);
create trigger trg_activities_updated_at before update on activities
  for each row execute function set_updated_at();
create index idx_activities_client_id on activities(client_id, activity_date desc);
create index idx_activities_type on activities(activity_type);

-- ============================================================
-- 10. action_items（次回アクション）
--     サイクル: 訪問→次回アクション→アラート→対応(活動記録)→次回アクション
-- ============================================================
create table action_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  source_activity_id uuid references activities(id) on delete set null, -- どの活動から生まれたか
  content text not null,
  due_date date not null, -- 次回予定日
  notify_before text not null check (notify_before in ('1_day','3_days','1_week','none')) default 'none',
  assigned_to uuid not null references profiles(id), -- 担当者
  status text not null check (status in ('pending','done','cancelled')) default 'pending',
  completed_at timestamptz,
  completed_activity_id uuid references activities(id) on delete set null, -- 対応済み時に作成された活動
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null,
  updated_by uuid references profiles(id) on delete set null
);
create trigger trg_action_items_updated_at before update on action_items
  for each row execute function set_updated_at();
create index idx_action_items_client_id on action_items(client_id);
create index idx_action_items_due_date on action_items(due_date) where (status = 'pending');
create index idx_action_items_assigned_to on action_items(assigned_to);

-- ============================================================
-- 11. alert_settings（アラートのしきい値等、設定値）
--     例: 訪問なしアラートの日数しきい値を30/60/90日で変更可能にする
-- ============================================================
create table alert_settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null
);
create trigger trg_alert_settings_updated_at before update on alert_settings
  for each row execute function set_updated_at();

insert into alert_settings (key, value, description) values
  ('no_visit_threshold_days', '90', '最終訪問日からこの日数以上経過したクライアントを「訪問なし」アラート対象とする');

-- ============================================================
-- 12. alerts（アラート：一覧表示・既読/対応管理用のキャッシュテーブル）
--     期限超過/今日対応/今週対応/3ヶ月訪問なし の4種を想定
--     実データは action_items / clients から定期的に再計算して反映する
--     （NestJS側のバッチ/スケジューラでUPSERTする想定。STEP11で実装）
-- ============================================================
create table alerts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  action_item_id uuid references action_items(id) on delete cascade,
  alert_type text not null check (alert_type in ('overdue','due_today','due_this_week','no_visit')),
  target_date date, -- 対応予定日、または最終訪問日
  status text not null check (status in ('open','dismissed','resolved')) default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_alerts_updated_at before update on alerts
  for each row execute function set_updated_at();
create index idx_alerts_client_id on alerts(client_id);
create index idx_alerts_status on alerts(status);
create unique index uidx_alerts_dedup
  on alerts(client_id, alert_type, coalesce(action_item_id, '00000000-0000-0000-0000-000000000000'))
  where (status = 'open');
