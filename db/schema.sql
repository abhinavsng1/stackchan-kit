-- Run against the Neon database before the reserve form goes live.
--   psql "$DATABASE_URL" -f db/schema.sql

create table if not exists preorders (
  id         bigserial   primary key,
  email      text        not null unique,
  name       text        not null,
  phone      text        not null,
  profession text        not null,
  address    text        not null,
  city       text        not null,
  pincode    text        not null,
  qty        smallint    not null default 1 check (qty between 1 and 5),
  created_at timestamptz not null default now()
);

-- If the table already exists from an earlier version, bring it forward.
-- Safe to run repeatedly.
alter table preorders add column if not exists phone      text;
alter table preorders add column if not exists profession text;
alter table preorders add column if not exists address    text;
alter table preorders add column if not exists pincode    text;

-- One person, one reservation, regardless of how they spell their number.
create unique index if not exists preorders_phone_key on preorders (phone);
