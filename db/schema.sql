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

-- ---------------------------------------------------------------------------
-- Cash on delivery. Additive and safe to re-run.
--
-- Booking takes a deposit through Razorpay, and the rest is collected in cash
-- when the kit is handed over. That second figure ends up on a packing slip and in
-- a courier's hands, so it is written here at the moment the deposit settles
-- rather than recomputed later from a price that may since have moved. What a
-- buyer is asked for at the door is what they agreed to, not what the site
-- happens to charge that week.
alter table preorders add column if not exists balance_due_paise integer;
alter table preorders add column if not exists balance_collected_at timestamptz;

-- Which orders still owe money, for whoever is packing the batch.
create index if not exists preorders_balance_outstanding
  on preorders (paid_at) where paid_at is not null and balance_collected_at is null;

-- ---------------------------------------------------------------------------
-- Edition: the assembled robot or the build kit. Additive and safe to re-run.
--
-- The two are packed differently, so every order has to say which it is.
-- Every order placed before this column existed was for the kit, because the
-- kit was the only thing on sale, so existing rows are filled in as 'kit'.
--
-- The default stays 'kit' on purpose. This runs before the release that sells
-- the robot is deployed, and until it is, the old page keeps inserting rows
-- without an edition — every one of them a kit order. The new application
-- always writes the column explicitly, so it never relies on the default.
alter table preorders add column if not exists edition text not null default 'kit';
alter table preorders drop constraint if exists preorders_edition_check;
alter table preorders add constraint preorders_edition_check check (edition in ('assembled', 'kit'));

-- ---------------------------------------------------------------------------
-- X attribution. Additive and safe to re-run.
--
-- The click id of the X ad an order came through, when there was one. It is
-- only in the address of the page the buyer landed on, so it is kept with the
-- order and sent to X's Conversion API when the deposit settles.
alter table preorders add column if not exists twclid text;

-- A buyer whose browser sent Global Privacy Control (the Sec-GPC header) when
-- ordering. Nothing about their order is reported to an ad platform from the
-- server — not when it is placed, and not when the webhook settles it later,
-- which is why the signal has to be kept with the order.
alter table preorders add column if not exists ad_opt_out boolean not null default false;
