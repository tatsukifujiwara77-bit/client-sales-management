-- 「profilesが存在しないログイン済みユーザー」を、SupabaseAuthGuardがその場で
-- 承認待ち(is_active=false)行として自己修復インサートできるようにするポリシー。
--
-- これが必要な理由: on_auth_user_created トリガーは auth.users に「新規追加された時」
-- しか発火しない。0004でトリガー自体は直したが、それより前に一度でもログインしたことがある
-- （＝auth.usersの行は既に存在する）アカウントには、そのトリガーはもう発火しない。
-- そのため、こうしたアカウントは「profilesが永久に存在しない」状態になり、
-- アクセスは正しくブロックされるものの、管理者の「ユーザー承認」一覧にも出てこない、
-- という盲点があった。
--
-- 本人が自分自身のidでのみinsertできる（role/is_activeの値自体はアプリ側で
-- 常に 'sales_rep' / false 固定にするため、これだけでは昇格に使えない）。

drop policy if exists profiles_insert_self on profiles;
create policy profiles_insert_self on profiles
  for insert to authenticated
  with check (id = auth.uid());
