-- ============================================================
-- client_notes(商談メモ)に会議種別・参加者項目を追加
-- 背景: これまで client_notes は「クライアントについて常に知っておくべきこと」の
-- 常設メモ、activities.notes が「商談ごとのメモ」という役割分担だったが、
-- 商談ごとの記録(訪問/オンラインの別、参加者)は client_notes 側(商談メモタブ)に
-- 持たせる方針に変更したため、ここに項目を追加する。
-- 既存データは値なし(null)のまま残し、削除・上書きは行わない。
-- ============================================================

alter table client_notes
  add column meeting_type text check (meeting_type in ('visit', 'online')),
  add column participants_own text,   -- 参加者(当社)
  add column participants_client text; -- 参加者(先方)
