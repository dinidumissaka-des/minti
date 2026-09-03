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
