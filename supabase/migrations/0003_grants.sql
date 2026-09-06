-- ============================================================
-- テーブルレベル権限(GRANT)の修正
-- 作成日: 2026-09-06
--
-- 背景:
--   0001/0002 でテーブルとRLSポリシーは正しく設定されているが、
--   Supabaseプロジェクトの標準ロール(anon/authenticated/service_role)に対する
--   スキーマレベルのデフォルト権限が本プロジェクトでは適用されておらず、
--   RLS以前の段階で "permission denied for table ..." (42501) が発生する状態だった。
--   (RLSは「GRANTで許可された範囲の中で、さらに行単位に絞り込む」ものであり、
--    テーブルへのGRANT自体が無ければ、RLSポリシーの内容に関わらず一切アクセスできない)
--
--   実際に service_role (RLSを完全にバイパスする最上位ロール) で
--   profiles / sales_stages に対して SELECT/UPDATE を試みても
--   42501 permission denied になることを確認済み。
--
-- 方針:
--   - service_role: バッチ処理等でRLSをバイパスして全操作を行う必要があるため、
--     public スキーマの全テーブルにSELECT/INSERT/UPDATE/DELETEを付与する
--   - authenticated: ログイン済みユーザーとして、RLSポリシーの範囲内でアクセス
--     できるよう、public スキーマの全テーブルにSELECT/INSERT/UPDATE/DELETEを付与する
--     （実際にどの行を読み書きできるかは引き続き 0002 のRLSが判定する。
--      GRANTは「テーブルに触れてよいか」、RLSは「どの行に触れてよいか」の役割分担）
--   - anon: 本アプリは招待制の業務システムであり、未ログインユーザーに一切の
--     テーブルアクセスを許可しない設計のため、意図的にGRANTを付与しない
--   - 今後追加されるテーブルにも同じ権限が自動的に適用されるよう、
--     ALTER DEFAULT PRIVILEGES も設定しておく
-- ============================================================

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to authenticated, service_role;

grant usage, select on all sequences in schema public
  to authenticated, service_role;

grant execute on all functions in schema public
  to authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;

alter default privileges in schema public
  grant execute on functions to authenticated, service_role;
