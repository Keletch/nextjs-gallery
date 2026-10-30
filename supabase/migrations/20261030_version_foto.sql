-- Versión de cada foto: sube al rotarla o voltearla en moderación y forma parte del nombre del
-- archivo (hash-v1.webp…), para que la caché de un año nunca sirva la versión anterior.
alter table public."imageInfo" add column if not exists version integer not null default 0;
