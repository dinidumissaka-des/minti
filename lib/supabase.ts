import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';
import { Browser } from '@capacitor/browser';
import type { Expense, NewExpense, Subscription, NewSubscription, Income, NewIncome } from '@/types';
import { isNative } from '@/lib/platform';

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

export async function getSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await getClient()
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addSubscription(data: NewSubscription, userId: string): Promise<Subscription> {
  const { data: inserted, error } = await getClient()
    .from('subscriptions')
    .insert([{ ...data, user_id: userId }])
    .select()
    .single();
  if (error) throw error;
  return inserted;
}

export async function deleteSubscription(id: string): Promise<void> {
  const { error } = await getClient().from('subscriptions').delete().eq('id', id);
  if (error) throw error;
}

export async function updateSubscription(id: string, data: Partial<NewSubscription>): Promise<void> {
  const { error } = await getClient().from('subscriptions').update(data).eq('id', id);
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
