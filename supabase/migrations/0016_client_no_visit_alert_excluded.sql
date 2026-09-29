-- クライアント個別に「3ヶ月訪問なしアラート」を対象外にできるようにする
alter table clients add column no_visit_alert_excluded boolean not null default false;
alter table clients add column no_visit_alert_excluded_reason text;
