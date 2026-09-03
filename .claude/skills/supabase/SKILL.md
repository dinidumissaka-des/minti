# Minti Supabase Patterns

Loaded when working on database queries, auth, or data fetching.

## Client
Singleton in `lib/supabase.ts` — `getClient()` returns the shared SupabaseClient. Never create a new client elsewhere; `lib/auth.ts` imports this one.

## Auth — `lib/auth.ts`, not `lib/supabase.ts`
Every call into `supabase.auth` lives in `lib/auth.ts`. `lib/supabase.ts` is the data layer and only reaches for auth to read `user.id`. Keep it that way — it is what makes a new credential type (passkeys next) a one-file change.

- `onAuthStateChange(cb)` — subscribe, returns `{ data: { subscription } }` to unsubscribe
- `sendEmailCode(email)` / `verifyEmailCode(email, token)` — the primary email path. A **6-digit code, never a magic link**: a link dead-ends in a browser on iOS. `shouldCreateUser: true`, so one call serves sign-in and sign-up
- `signInWithGoogle()` / `signInWithApple()` — `appleWebSignInEnabled()` gates the web Apple button
- `signInWithPasskey()` / `registerPasskey()` / `listPasskeys()` / `deletePasskey(id)` — gate every one behind `passkeysSupported()` (false on native: no registrable domain in the Capacitor shell). Supabase returns `{ data, error }` here instead of throwing; `lib/auth.ts` rethrows so callers match the rest. Needs `auth.experimental.passkey` on the client and Passkeys enabled in the dashboard
- `signInWithPassword()` — legacy fallback, unadvertised in the UI. There is no password sign-up counterpart; don't add one back
- `signOut()`, `completeNativeOAuth(url)`
- User ID from `user.id` (UUID) — always pass to insert functions

Codes only send if the Supabase Magic Link template contains `{{ .Token }}`, and *Confirm email* must stay on for identity linking. See README → Authentication.

## CRUD pattern
```ts
// Read
const { data, error } = await getClient().from('table').select('*').order('created_at', { ascending: false });
if (error) throw error;
return data ?? [];

// Insert (always pass user_id)
const { data: inserted, error } = await getClient()
  .from('table').insert([{ ...data, user_id: userId }]).select().single();
if (error) throw error;
return inserted;

// Update
const { error } = await getClient().from('table').update(data).eq('id', id);
if (error) throw error;

// Delete
const { error } = await getClient().from('table').delete().eq('id', id);
if (error) throw error;
```

## Tables
### expenses
```
id uuid PK, user_id uuid FK→auth.users, description text, category text,
amount numeric, date text (YYYY-MM-DD), time text (HH:MM AM/PM), created_at timestamptz
```
Fetch by month: `.gte('date', from).lte('date', to)` — use `getExpensesByMonth(year, month)`

### subscriptions
```
id uuid PK, user_id uuid FK→auth.users, name text, amount numeric,
category text, billing_day integer default 1, created_at timestamptz
```
`billing_day` is stored but not shown in UI. Always insert with `billing_day: 1`.

## RLS
Both tables have RLS enabled with policy: `auth.uid() = user_id`. Always pass `user_id` on insert — queries without it will return empty (not an error).

## New table checklist
1. Add SQL migration to `supabase/migration.sql`
2. Enable RLS + policy
3. Add types to `types/index.ts`
4. Add CRUD functions to `lib/supabase.ts` following the pattern above
