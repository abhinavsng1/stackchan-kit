-- Run against the Neon database before the reserve form goes live.
--   psql "$DATABASE_URL" -f db/schema.sql

create table if not exists preorders (
  id         bigserial   primary key,
  email      text        not null unique,
  name       text        not null,
  qty        smallint    not null default 1 check (qty between 1 and 5),
  city       text,
  created_at timestamptz not null default now()
);
