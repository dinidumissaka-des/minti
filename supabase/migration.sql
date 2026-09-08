-- Every statement here is guarded, so the file is re-runnable against a
-- database that already has some of it.

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  category text not null,
  amount numeric(10, 2) not null,
  date date not null default current_date,
  time text,
  created_at timestamptz not null default now()
);

alter table expenses enable row level security;

drop policy if exists "own expenses" on expenses;
create policy "own expenses" on expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- A database set up before auth may still carry a policy named "allow all"
-- (`using (true)`). Permissive policies are OR'd together, so that one alone
-- exposes every account's rows to every signed-in user, and the policy above
-- does not override it. It is not dropped here, because dropping the only
-- policy a live table has would hide every row from its owner: confirm what is
-- actually there first, then drop it by hand.
--
--   select tablename, policyname, qual from pg_policies where schemaname = 'public';
--   drop policy if exists "allow all" on expenses;

-- ─── Settings and income ──────────────────────────────────────────────────────
-- Neither table was ever in this file, so a fresh project came up without them
-- and getUserSettings failed silently — settings lived only in localStorage.

create table if not exists user_settings (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  budget         numeric,
  monthly_income numeric,
  currency       text,
  base_currency  text,
  updated_at     timestamptz not null default now()
);

alter table user_settings enable row level security;

drop policy if exists "own settings" on user_settings;
create policy "own settings" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists income_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  source     text not null,
  amount     numeric not null,
  date       date not null default current_date,
  created_at timestamptz not null default now()
);

alter table income_entries enable row level security;

drop policy if exists "own income" on income_entries;
create policy "own income" on income_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

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
