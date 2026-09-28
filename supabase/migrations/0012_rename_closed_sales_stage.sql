-- 「契約終了」フェーズの名称を「締結完了」に変更する
-- (新規環境の初期データは0001で「営業終了」として投入されているため、is_closedで対象を特定する)
update sales_stages set name = '締結完了' where is_closed = true;
