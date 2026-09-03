import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';
import { Browser } from '@capacitor/browser';
import type { Expense, NewExpense, Subscription, NewSubscription, Income, NewIncome } from '@/types';
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

export async function addExpense(data: NewExpense, userId: string): Promise<Expense> {
  const { data: inserted, error } = await getClient()
    .from('expenses')
    .insert([{ ...data, user_id: userId }])
    .select()
    .single();

  if (error) throw error;
  return inserted;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await getClient().from('expenses').delete().eq('id', id);
  if (error) throw error;
}

export async function updateExpense(id: string, data: Partial<Omit<Expense, 'id' | 'created_at'>>): Promise<void> {
  const { error } = await getClient().from('expenses').update(data).eq('id', id);
  if (error) throw error;
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
  if (error) throw error;
  return data ?? [];
}

// Starts in the month being viewed, and runs from there on.
export async function addSubscription(
  data: NewSubscription,
  userId: string,
  from: { year: number; month: number },
): Promise<Subscription> {
  const { data: inserted, error } = await getClient()
    .from('subscriptions')
    .insert([{ ...data, user_id: userId, start_month: monthKey(from.year, from.month), end_month: null }])
    .select()
    .single();
  if (error) throw error;
  return inserted;
}

// Stops from this month on. A bill that started in the month being viewed
// never applied to an earlier one, so that row is removed outright.
export async function deleteSubscription(
  sub: Subscription,
  from: { year: number; month: number },
): Promise<void> {
  if (sub.start_month >= monthKey(from.year, from.month)) {
    const { error } = await getClient().from('subscriptions').delete().eq('id', sub.id);
    if (error) throw error;
    return;
  }
  const { error } = await getClient()
    .from('subscriptions')
    .update({ end_month: prevMonthKey(from.year, from.month) })
    .eq('id', sub.id);
  if (error) throw error;
}

// Applies from this month on: the old row is closed at the month before and a
// new one opens, inheriting the end of the row it replaces so a later version
// of the same bill is not overlapped. A row that started this month is edited
// in place — there is no earlier month for it to protect.
export async function updateSubscription(
  sub: Subscription,
  data: Partial<NewSubscription>,
  from: { year: number; month: number },
  userId: string,
): Promise<void> {
  const key = monthKey(from.year, from.month);
  if (sub.start_month >= key) {
    const { error } = await getClient().from('subscriptions').update(data).eq('id', sub.id);
    if (error) throw error;
    return;
  }

  const { error: closeError } = await getClient()
    .from('subscriptions')
    .update({ end_month: prevMonthKey(from.year, from.month) })
    .eq('id', sub.id);
  if (closeError) throw closeError;

  const { error } = await getClient().from('subscriptions').insert([{
    name: sub.name,
    amount: sub.amount,
    category: sub.category,
    billing_day: sub.billing_day,
    ...data,
    user_id: userId,
    start_month: key,
    end_month: sub.end_month,
  }]);
  if (error) throw error;
}

export async function getUserSettings(): Promise<{ budget: number | null; currency: string; monthly_income: number | null } | null> {
  const { data } = await getClient()
    .from('user_settings')
    .select('budget, currency, monthly_income')
    .maybeSingle();
  return data ?? null;
}

export async function upsertUserSettings(settings: { budget?: number | null; currency?: string; monthly_income?: number | null }): Promise<void> {
  const { data: { user } } = await getClient().auth.getUser();
  if (!user) return;
  await getClient()
    .from('user_settings')
    .upsert(
      { user_id: user.id, ...settings, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
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
  const { data: inserted, error } = await getClient()
    .from('income_entries')
    .insert([{ ...data, user_id: userId }])
    .select()
    .single();
  if (error) throw error;
  return inserted;
}

export async function deleteIncome(id: string): Promise<void> {
  const { error } = await getClient().from('income_entries').delete().eq('id', id);
  if (error) throw error;
}

export async function updateIncome(id: string, data: Partial<NewIncome>): Promise<void> {
  const { error } = await getClient().from('income_entries').update(data).eq('id', id);
  if (error) throw error;
}
