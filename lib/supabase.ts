import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';
import { Browser } from '@capacitor/browser';
import type { Expense, NewExpense, ExpenseHistoryRow, Subscription, NewSubscription, Income, NewIncome } from '@/types';
import { isNative } from '@/lib/platform';
import { monthKey, prevMonthKey } from '@/lib/months';

export const NATIVE_OAUTH_REDIRECT = 'com.minti.app://auth/callback';

const nativeStorage = {
  getItem: async (key: string) => (await Preferences.get({ key })).value,
  setItem: async (key: string, value: string) => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string) => {
    await Preferences.remove({ key });
  },
};

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    _client = isNative()
      ? createClient(url, key, {
          auth: {
            storage: nativeStorage,
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            flowType: 'pkce',
          },
        })
      : createClient(url, key);
  }
  return _client;
}

export async function getExpensesByMonth(year: number, month: number): Promise<Expense[]> {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await getClient()
    .from('expenses')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// The suggestion chips rank a description by how many months it recurs in, so
// they have to read past the month on screen. Only the columns a chip needs,
// newest first, and bounded — a row of chips is not worth an unbounded table
// scan, and a year of daily spending still fits inside the cap.
const HISTORY_ROW_LIMIT = 1000;

export async function getExpenseHistory(): Promise<ExpenseHistoryRow[]> {
  const { data, error } = await getClient()
    .from('expenses')
    .select('description, category, amount, currency, date')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(HISTORY_ROW_LIMIT);

  if (error) throw error;
  return data ?? [];
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  return getClient().auth.onAuthStateChange((_, session) => {
    callback(session?.user ?? null);
  });
}

export async function signUp(email: string, password: string) {
  const { data, error } = await getClient().auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await getClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await getClient().auth.signOut();
  if (error) throw error;
}

async function startOAuth(provider: "google" | "apple") {
  if (!isNative()) {
    const { error } = await getClient().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw error;
    return;
  }

  const { data, error } = await getClient().auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: NATIVE_OAUTH_REDIRECT,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (data.url) await Browser.open({ url: data.url });
}

export async function signInWithGoogle() {
  await startOAuth("google");
}

export async function signInWithApple() {
  await startOAuth("apple");
}

export async function completeNativeOAuth(callbackUrl: string) {
  const params = new URL(callbackUrl).searchParams;

  const errorDescription = params.get("error_description") ?? params.get("error");
  if (errorDescription) {
    await Browser.close().catch(() => {});
    throw new Error(errorDescription);
  }

  const code = params.get("code");
  if (!code) return;

  const { error } = await getClient().auth.exchangeCodeForSession(code);
  await Browser.close().catch(() => {});
  if (error) throw error;
}

// `currency` arrives with supabase/migration.sql alongside the month columns.
// Until it is applied, a write naming it is rejected outright, so each one
// below retries without it rather than losing the entry. Reads need no
// fallback: `select('*')` simply returns whatever columns exist, and a row
// with no currency of its own is read as the account's base.
let currencyColumnMissing = false;

export function currencyNeedsMigration(): boolean {
  return currencyColumnMissing;
}

function isMissingCurrencyColumn(error: { code?: string; message?: string; details?: string | null } | null): boolean {
  if (!error) return false;
  if (error.code !== '42703' && error.code !== 'PGRST204') return false;
  if (!/currency/.test(`${error.message ?? ''} ${error.details ?? ''}`)) return false;
  currencyColumnMissing = true;
  return true;
}

function withoutCurrency<T extends Record<string, unknown>>(row: T): Omit<T, 'currency'> {
  const { currency: _currency, ...rest } = row;
  return rest;
}

export async function addExpense(data: NewExpense, userId: string): Promise<Expense> {
  const row = { ...data, user_id: userId };
  const { data: inserted, error } = await getClient()
    .from('expenses')
    .insert([row])
    .select()
    .single();

  if (!error) return inserted;
  if (!isMissingCurrencyColumn(error)) throw error;

  const { data: retried, error: retryError } = await getClient()
    .from('expenses')
    .insert([withoutCurrency(row)])
    .select()
    .single();
  if (retryError) throw retryError;
  return retried;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await getClient().from('expenses').delete().eq('id', id);
  if (error) throw error;
}

export async function updateExpense(id: string, data: Partial<Omit<Expense, 'id' | 'created_at' | 'original'>>): Promise<void> {
  const { error } = await getClient().from('expenses').update(data).eq('id', id);
  if (!error) return;
  if (!isMissingCurrencyColumn(error)) throw error;

  const { error: retryError } = await getClient().from('expenses').update(withoutCurrency(data)).eq('id', id);
  if (retryError) throw retryError;
}

// The month-scoping columns arrive with supabase/migration.sql. Until that has
// been applied, PostgREST rejects every query that names them and the whole
// Bills view dies — which is how "Could not load bills" got blamed on the
// network. A bill you cannot see is worse than one shown in the wrong month,
// so each call below falls back to the unscoped behaviour and records that the
// database is behind, for the UI to say so.
let periodColumnsMissing = false;

export function subscriptionsNeedMigration(): boolean {
  return periodColumnsMissing;
}

function isMissingPeriodColumn(error: { code?: string; message?: string; details?: string | null } | null): boolean {
  if (!error) return false;
  // 42703 is Postgres' undefined_column on a filter; PGRST204 is PostgREST not
  // finding the column in its schema cache on a write.
  if (error.code !== '42703' && error.code !== 'PGRST204') return false;
  if (!/start_month|end_month/.test(`${error.message ?? ''} ${error.details ?? ''}`)) return false;
  periodColumnsMissing = true;
  return true;
}

async function allSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await getClient()
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// A bill is a chain of rows, each valid for a range of months, so a change
// made in one month never rewrites what an earlier month was charged.
export async function getSubscriptionsForMonth(year: number, month: number): Promise<Subscription[]> {
  const key = monthKey(year, month);
  // A row with no period at all — one written before the columns existed, or
  // one the backfill missed — is treated as always active rather than filtered
  // out of every month. Losing sight of a bill is worse than showing it early.
  const { data, error } = await getClient()
    .from('subscriptions')
    .select('*')
    .or(`start_month.is.null,start_month.lte.${key}`)
    .or(`end_month.is.null,end_month.gte.${key}`)
    .order('created_at', { ascending: false });
  if (!error) return data ?? [];
  if (!isMissingPeriodColumn(error)) throw error;
  return allSubscriptions();
}


function withoutPeriod<T extends Record<string, unknown>>(row: T) {
  const { start_month: _start, end_month: _end, ...rest } = row;
  return rest;
}

// Either column class can be the one this database has not been migrated for,
// so drop whichever the server names and try again — up to once per class.
async function writeSubscription<T>(
  row: Record<string, unknown>,
  send: (row: Record<string, unknown>) => PromiseLike<{ data: T | null; error: { code?: string; message?: string; details?: string | null } | null }>,
): Promise<T | null> {
  let payload = row;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await send(payload);
    if (!error) return data;
    if (isMissingCurrencyColumn(error)) payload = withoutCurrency(payload);
    else if (isMissingPeriodColumn(error)) payload = withoutPeriod(payload);
    else throw error;
  }
  throw new Error('Could not write the bill.');
}

// Starts in the month being viewed, and runs from there on.
export async function addSubscription(
  data: NewSubscription,
  userId: string,
  from: { year: number; month: number },
): Promise<Subscription> {
  const row = { ...data, user_id: userId, start_month: monthKey(from.year, from.month), end_month: null };
  const inserted = await writeSubscription<Subscription>(row, (payload) =>
    getClient().from('subscriptions').insert([payload]).select().single(),
  );
  return inserted as Subscription;
}

// Stops from this month on. A bill that started in the month being viewed
// never applied to an earlier one, so that row is removed outright — as is one
// carrying no start at all, which has no earlier month to protect either.
export async function deleteSubscription(
  sub: Subscription,
  from: { year: number; month: number },
): Promise<void> {
  if (!sub.start_month || sub.start_month >= monthKey(from.year, from.month)) {
    const { error } = await getClient().from('subscriptions').delete().eq('id', sub.id);
    if (error) throw error;
    return;
  }
  const { error } = await getClient()
    .from('subscriptions')
    .update({ end_month: prevMonthKey(from.year, from.month) })
    .eq('id', sub.id);
  if (!error) return;
  if (!isMissingPeriodColumn(error)) throw error;

  const { error: dropError } = await getClient().from('subscriptions').delete().eq('id', sub.id);
  if (dropError) throw dropError;
}

// Applies from this month on: the old row is closed at the month before and a
// new one opens, inheriting the end of the row it replaces so a later version
// of the same bill is not overlapped. A row that started this month — or that
// carries no start at all — is edited in place, having no earlier month to
// protect.
export async function updateSubscription(
  sub: Subscription,
  data: Partial<NewSubscription>,
  from: { year: number; month: number },
  userId: string,
): Promise<void> {
  const key = monthKey(from.year, from.month);
  if (!sub.start_month || sub.start_month >= key) {
    await writeSubscription(data as Record<string, unknown>, (payload) =>
      getClient().from('subscriptions').update(payload).eq('id', sub.id).select().maybeSingle(),
    );
    return;
  }

  const { error: closeError } = await getClient()
    .from('subscriptions')
    .update({ end_month: prevMonthKey(from.year, from.month) })
    .eq('id', sub.id);
  if (closeError) {
    if (!isMissingPeriodColumn(closeError)) throw closeError;
    await writeSubscription(data as Record<string, unknown>, (payload) =>
      getClient().from('subscriptions').update(payload).eq('id', sub.id).select().maybeSingle(),
    );
    return;
  }

  await writeSubscription({
    name: sub.name,
    amount: sub.amount,
    currency: sub.currency ?? null,
    category: sub.category,
    billing_day: sub.billing_day,
    ...data,
    user_id: userId,
    start_month: key,
    end_month: sub.end_month,
  }, (payload) => getClient().from('subscriptions').insert([payload]).select().maybeSingle());
}

export type UserSettings = {
  budget: number | null;
  currency: string;
  monthly_income: number | null;
  // A saved amount records what it was entered in, exactly like an expense row.
  // These replaced `base_currency`, which had to stand in for both of them and
  // for every untagged row at once, from a single value nobody had been asked for.
  budget_currency: string | null;
  income_currency: string | null;
};

export async function getUserSettings(): Promise<UserSettings | null> {
  const { data, error } = await getClient()
    .from('user_settings')
    .select('budget, currency, monthly_income, budget_currency, income_currency')
    .maybeSingle();
  if (!error) return (data as UserSettings) ?? null;
  if (!isMissingCurrencyColumn(error)) throw error;

  const { data: legacy } = await getClient()
    .from('user_settings')
    .select('budget, currency, monthly_income')
    .maybeSingle();
  if (!legacy) return null;
  return {
    ...(legacy as Omit<UserSettings, 'budget_currency' | 'income_currency'>),
    budget_currency: null,
    income_currency: null,
  };
}

export async function upsertUserSettings(settings: {
  budget?: number | null;
  currency?: string;
  monthly_income?: number | null;
  budget_currency?: string;
  income_currency?: string;
}): Promise<void> {
  const { data: { user } } = await getClient().auth.getUser();
  if (!user) return;
  const row = { user_id: user.id, ...settings, updated_at: new Date().toISOString() };
  const { error } = await getClient().from('user_settings').upsert(row, { onConflict: 'user_id' });
  if (!error || !isMissingCurrencyColumn(error)) return;

  const { budget_currency: _b, income_currency: _i, ...rest } = row;
  await getClient().from('user_settings').upsert(rest, { onConflict: 'user_id' });
}

export async function getIncomeByMonth(year: number, month: number): Promise<Income[]> {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const { data, error } = await getClient()
    .from('income_entries')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addIncome(data: NewIncome, userId: string): Promise<Income> {
  const row = { ...data, user_id: userId };
  const { data: inserted, error } = await getClient()
    .from('income_entries')
    .insert([row])
    .select()
    .single();
  if (!error) return inserted;
  if (!isMissingCurrencyColumn(error)) throw error;

  const { data: retried, error: retryError } = await getClient()
    .from('income_entries')
    .insert([withoutCurrency(row)])
    .select()
    .single();
  if (retryError) throw retryError;
  return retried;
}

export async function deleteIncome(id: string): Promise<void> {
  const { error } = await getClient().from('income_entries').delete().eq('id', id);
  if (error) throw error;
}

export async function updateIncome(id: string, data: Partial<NewIncome>): Promise<void> {
  const { error } = await getClient().from('income_entries').update(data).eq('id', id);
  if (!error) return;
  if (!isMissingCurrencyColumn(error)) throw error;

  const { error: retryError } = await getClient().from('income_entries').update(withoutCurrency(data)).eq('id', id);
  if (retryError) throw retryError;
}
