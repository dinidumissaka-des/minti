create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  category text not null,
  amount numeric(10, 2) not null,
  date date not null default current_date,
  time text,
  created_at timestamptz not null default now()
);

alter table expenses enable row level security;

-- Allow all operations (no auth for now). Dropped first so the whole file stays
-- re-runnable: a duplicate policy aborts the transaction before anything below
-- it is applied.
drop policy if exists "allow all" on expenses;
create policy "allow all" on expenses for all using (true) with check (true);

-- ─── Subscriptions become month-scoped ────────────────────────────────────────
-- A row is one *version* of a bill, valid for a range of months. A bill added
-- in September applies to September and every month after it, and never to
-- August; editing it in September closes the old row at August and opens a new
-- one, so past months keep the amount they were actually charged.
--
-- Active in month M  <=>  start_month <= M and (end_month is null or end_month >= M)
-- Both are 'YYYY-MM', so string comparison is chronological.

alter table subscriptions
  add column if not exists start_month text,
  add column if not exists end_month   text;

-- Existing rows start the month they were created: that is the only signal we
-- have for when the bill actually began, and it is what makes past months stop
-- counting bills added later.
update subscriptions
   set start_month = to_char(created_at, 'YYYY-MM')
 where start_month is null;

alter table subscriptions
  alter column start_month set not null;

create index if not exists subscriptions_period_idx
  on subscriptions (user_id, start_month, end_month);

-- ─── Amounts carry the currency they were entered in ──────────────────────────
-- Changing the display currency used to relabel every figure without touching
-- the numbers, so 40 AED became "40 USD". An amount now records what it was
-- entered in and is converted for display; a row with no currency of its own
-- is read as the account's `base_currency`, which is fixed at whatever the
-- account was already using so existing history keeps its meaning.

alter table expenses       add column if not exists currency text;
alter table subscriptions  add column if not exists currency text;
alter table income_entries add column if not exists currency text;

alter table user_settings  add column if not exists base_currency text;

-- Backfill: whatever an account is displaying today is what its untagged rows
-- were entered in. `currency` is deliberately left null on existing rows rather
-- than stamped — null already means "the base", and stamping would freeze
-- today's guess onto history if the base is ever corrected.
update user_settings
   set base_currency = currency
 where base_currency is null;
