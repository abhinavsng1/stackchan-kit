-- Run against the Neon database BEFORE deploying the free reservation form.
--   psql "$DATABASE_URL" -f db/schema.sql

create table if not exists preorders (
  id         bigserial   primary key,
  email      text        not null unique,
  name       text        not null,
  phone      text,
  profession text,
  address    text,
  city       text,
  pincode    text,
  qty        smallint    not null default 1 check (qty between 1 and 5),
  created_at timestamptz not null default now()
);

-- If the table already exists from an earlier version, bring it forward.
-- Safe to run repeatedly.
alter table preorders add column if not exists phone      text;
alter table preorders add column if not exists profession text;
alter table preorders add column if not exists address    text;
alter table preorders add column if not exists city       text;
alter table preorders add column if not exists pincode    text;

-- Name, email, and quantity reserve a place. Fulfillment details come later.
-- Only relax constraints: existing reservations and their details stay intact.
alter table preorders alter column phone drop not null;
alter table preorders alter column profession drop not null;
alter table preorders alter column address drop not null;
alter table preorders alter column city drop not null;
alter table preorders alter column pincode drop not null;

-- Supplied numbers stay unique. PostgreSQL permits multiple NULL values here,
-- so reservations without a phone do not collide with one another.
create unique index if not exists preorders_phone_key on preorders (phone);

-- ---------------------------------------------------------------------------
-- Payments. Additive and safe to re-run.
--
-- A reservation is paid for through a link we email, never through an open
-- checkout, so each row carries an unguessable token. That token is the only
-- way to start a payment, which means every payment is attributable to exactly
-- one reservation and nobody can create orders against the account at will.
alter table preorders add column if not exists payment_token      text;
alter table preorders add column if not exists razorpay_order_id  text;
alter table preorders add column if not exists razorpay_payment_id text;
alter table preorders add column if not exists amount_paid_paise  integer;
alter table preorders add column if not exists paid_at            timestamptz;

-- Tokens and order ids are looked up on every payment request, and neither may
-- ever point at two reservations.
create unique index if not exists preorders_payment_token_key on preorders (payment_token);
create unique index if not exists preorders_order_id_key      on preorders (razorpay_order_id);

-- Tokens are generated in application code with Node's CSPRNG rather than in
-- SQL, so this schema needs no pgcrypto extension. Backfill older rows with:
--   npm run backfill-tokens
