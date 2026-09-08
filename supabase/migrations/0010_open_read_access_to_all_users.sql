-- ============================================================
-- クライアント関連データの閲覧(SELECT)を全認証ユーザーに開放する
-- ============================================================
-- 背景: 0002で導入した can_access_client() による閲覧制限
-- (admin=全件 / office_manager=自拠点 / sales_rep=担当・開拓したクライアント
-- のみ)により、営業担当者間で登録した情報が共有されない状態になっていた
-- (「別ユーザーでログインすると何も登録されていないように見える。
-- 情報共有ができない。ユーザーごとに個別にする必要はなく、全員に表示
-- されるようにしてほしい」との明示的な指示)。
--
-- 方針: 閲覧(SELECT)のみ全認証ユーザーに開放し、登録・変更・削除
-- (INSERT/UPDATE/DELETE)は引き続き既存のロール・拠点・担当ベースの
-- 制限を維持する(担当者以外が勝手に他クライアントの情報を編集・削除
-- できてしまう事態は避けたいため)。
--
-- 実装: Postgresの複数permissiveポリシーはOR結合されるため、0002で
-- 定義した既存ポリシー(for all / for select、いずれもcan_access_client()
-- ベース)はそのまま残し、SELECT専用の許可ポリシー(using (true))を
-- 追加するだけでよい。
-- ============================================================

drop policy if exists clients_select_all on clients;
create policy clients_select_all on clients
  for select to authenticated using (true);

drop policy if exists client_assignments_select_all on client_assignments;
create policy client_assignments_select_all on client_assignments
  for select to authenticated using (true);

drop policy if exists client_contacts_select_all on client_contacts;
create policy client_contacts_select_all on client_contacts
  for select to authenticated using (true);

drop policy if exists client_notes_select_all on client_notes;
create policy client_notes_select_all on client_notes
  for select to authenticated using (true);

drop policy if exists activities_select_all on activities;
create policy activities_select_all on activities
  for select to authenticated using (true);

drop policy if exists action_items_select_all on action_items;
create policy action_items_select_all on action_items
  for select to authenticated using (true);

drop policy if exists alerts_select_all on alerts;
create policy alerts_select_all on alerts
  for select to authenticated using (true);

drop policy if exists client_note_attachments_select_all on client_note_attachments;
create policy client_note_attachments_select_all on client_note_attachments
  for select to authenticated using (true);

-- Storage: 添付ファイル本体のダウンロード(署名付きURL発行)もSELECT相当のため同様に開放する
drop policy if exists client_attachments_storage_select_all on storage.objects;
create policy client_attachments_storage_select_all on storage.objects
  for select to authenticated using (bucket_id = 'client-attachments');
