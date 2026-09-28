-- クライアントの都道府県（所在地から自動導出してサーバー側で保存する専用カラム。手入力欄は設けない）
alter table clients add column prefecture text;
create index idx_clients_prefecture on clients(prefecture);
