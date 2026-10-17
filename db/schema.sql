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
-- Pricing experiment on /pebble-chan. Additive and safe to re-run.
--
-- Two columns, because a conversion rate needs two numbers. `variant` on the
-- order is the numerator: which price this buyer was actually shown.
-- variant_views is the denominator: how many people saw each price. With only
-- the first, the arms cannot be compared at all.
alter table preorders add column if not exists variant text;

create table if not exists variant_views (
  day     date    not null,
  variant text    not null,
  count   integer not null default 0,
  primary key (day, variant)
);

-- ---------------------------------------------------------------------------
-- Shell colour. Additive and safe to re-run.
--
-- Optional at the form, so it is nullable here: every order placed before the
-- picker existed has no answer, and inventing one for them would be a guess
-- written into the record. The application fills the default on new orders,
-- which is why there is no default on the column — a default here would make
-- an old row indistinguishable from a deliberate choice.
alter table preorders add column if not exists shell text;

-- ---------------------------------------------------------------------------
-- How the buyer pays. Additive and safe to re-run.
--
-- 'deposit' is the original arrangement: ₹499 books it, the rest is collected
-- in cash at the door. 'full' is the whole price online, nothing on delivery.
--
-- The default is 'deposit' because every order placed before this column
-- existed was one, and because an order that somehow arrives without a plan
-- is safer understood as the one that collects money later than as one that
-- claims the buyer has already paid in full.
alter table preorders add column if not exists plan text not null default 'deposit';
alter table preorders drop constraint if exists preorders_plan_check;
alter table preorders add constraint preorders_plan_check check (plan in ('deposit', 'full'));

-- ---------------------------------------------------------------------------
-- Unpaid-booking recovery. Additive and safe to re-run.
--
-- When the reminder for this booking was sent. NULL means never, and the cron
-- only picks up rows where it is NULL, so the column is both the record and
-- the lock: a buyer is emailed once, however many times the job runs.
alter table preorders add column if not exists recovery_sent_at timestamptz;

-- The job's working set: unpaid, never reminded. Partial, so it stays small
-- however many paid orders accumulate.
create index if not exists preorders_awaiting_recovery
  on preorders (created_at)
  where paid_at is null and recovery_sent_at is null;

-- ---------------------------------------------------------------------------
-- Coupons and the online balance, on the order. Additive and safe to re-run.
--
-- The columns land here, with the plan they belong to, because lib/preorders.ts
-- reads them from the moment plans exist: a booking always has a discount, even
-- when that discount is zero, and always has a balance, even when it is already
-- paid. The coupons table itself and the pay-the-balance flow follow.
alter table preorders add column if not exists coupon_code    text;
alter table preorders add column if not exists discount_paise integer not null default 0;
alter table preorders add column if not exists balance_paid_at    timestamptz;
alter table preorders add column if not exists balance_payment_id text;

-- ---------------------------------------------------------------------------
-- Coupons. Additive and safe to re-run.
--
-- A code is a promise about money, so every limit that promise depends on is
-- a column here rather than a rule in application code: which plans it works
-- on, how many times it may be used, how much it can ever be worth. The
-- application reads them, and does not decide them.
--
-- Redemptions are counted when a payment settles, never when a code is typed.
-- A code that counted on entry could be exhausted by people who never paid.
create table if not exists coupons (
  code               text        primary key,
  kind               text        not null check (kind in ('fixed', 'percent')),
  -- Paise for 'fixed'; whole percent for 'percent'.
  value              integer     not null check (value > 0),
  -- The most a percentage code may ever be worth. NULL means uncapped.
  max_discount_paise integer,
  min_qty            smallint    not null default 1,
  -- Which plans accept it, as a list. Empty means every plan.
  plans              text[]      not null default '{}',
  starts_at          timestamptz,
  ends_at            timestamptz,
  max_uses           integer,
  per_email_limit    integer,
  redeemed           integer     not null default 0,
  active             boolean     not null default true,
  label              text,
  created_at         timestamptz not null default now()
);

-- Which orders used which code, for counting per-email use and for reading
-- back what a given code actually sold.
create index if not exists preorders_coupon on preorders (coupon_code) where coupon_code is not null;

-- ---------------------------------------------------------------------------
-- Paying the balance online, before dispatch. Additive and safe to re-run.
--
-- A second Razorpay order against the same booking, so it needs its own id
-- column: razorpay_order_id belongs to the deposit, and overwriting it would
-- lose the link between a booking and the payment that created it.
alter table preorders add column if not exists balance_order_id text;
create unique index if not exists preorders_balance_order_id_key
  on preorders (balance_order_id) where balance_order_id is not null;

-- When the "pay it now instead" email went out, so nobody is asked twice.
alter table preorders add column if not exists balance_asked_at timestamptz;

-- ---------------------------------------------------------------------------
-- Which plan people choose. Additive and safe to re-run.
--
-- The same shape as variant_views, and for the same reason: a counter, not a
-- log. Day and plan, nothing else — no address, no agent string, nothing to
-- join a person to.
--
-- Counted on the server when a payment is started, because that is the moment
-- a plan is actually chosen. Mixpanel already carries `plan` on its events,
-- but an ad blocker that swallows the browser's beacon would quietly bias the
-- comparison, and this is the number the decision gets made on.
create table if not exists plan_chosen (
  day   date    not null,
  plan  text    not null,
  count integer not null default 0,
  primary key (day, plan)
);

-- ---------------------------------------------------------------------------
-- One-tap checkout. Additive and safe to re-run.
--
-- A flag rather than a fulfilment state, deliberately. Fulfilment has its own
-- constraint and its own meaning — where the parcel is — and a payment whose
-- shape we did not recognise is not a place a parcel can be. This says only
-- "a person should look at this order before it ships".
alter table preorders add column if not exists needs_review boolean not null default false;
create index if not exists preorders_needs_review on preorders (created_at) where needs_review;

-- ---------------------------------------------------------------------------
-- The back office. Additive and safe to re-run.
--
-- Archiving hides an order from the working list without destroying it: a
-- test booking, a duplicate, somebody who asked to be removed. The row stays,
-- because an order that was once real is part of the record even when it is
-- no longer worth looking at.
alter table preorders add column if not exists archived_at timestamptz;

-- Why a person touched this order by hand. Written whenever the dashboard
-- settles money that did not come through the gateway, so a payment with no
-- Razorpay id has an explanation attached rather than looking like a bug.
alter table preorders add column if not exists admin_note text;

create index if not exists preorders_live_orders
  on preorders (created_at desc) where archived_at is null;
