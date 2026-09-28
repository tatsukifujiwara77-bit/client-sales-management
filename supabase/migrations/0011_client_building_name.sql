-- クライアントの所在地とは別に、ビル名を保持できるようにする
-- (地図表示・ジオコーディングには所在地(address)のみを使い、ビル名は表示時に連結する)
alter table clients add column building_name text;
