-- 新規ログイン（Google認証）で自動作成されるprofilesを「承認待ち（is_active=false）」状態にする。
--
-- これまでは handle_new_user() が is_active のデフォルト値(true)のままprofilesを作成していたため、
-- Googleアカウントさえあれば誰でもログイン即・sales_rep権限でアプリを使えてしまっていた。
-- 今後は新規ログイン時点では is_active=false の行だけが作られ、
-- 管理者が「ユーザー承認」画面（PATCH /users/:id/approve）で明示的に有効化するまでは
-- SupabaseAuthGuardが「This account has been deactivated.」としてアクセスを拒否する。
--
-- 既存の(すでにis_active=trueな)profiles行には一切影響しない。

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, '未設定'),
    coalesce(new.raw_user_meta_data ->> 'role', 'sales_rep'),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
