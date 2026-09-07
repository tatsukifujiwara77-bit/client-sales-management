-- 拠点マスタに不足していた地域を追加する（既存: 九州／北海道／東北／関東／関西）。
-- 「営業部」等の接尾辞は付けない方針（過去の拠点名変更時の決定に合わせる）。
-- 既に同名の拠点が存在する場合は何もしない（このSQLを再実行しても重複しない）。
insert into offices (name)
select v.name
from (values ('中部'), ('中国'), ('四国'), ('沖縄')) as v(name)
where not exists (select 1 from offices o where o.name = v.name);
