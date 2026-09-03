import { User } from '@supabase/supabase-js';
import { Browser } from '@capacitor/browser';
import { getClient } from '@/lib/supabase';
import { isNative } from '@/lib/platform';

export const NATIVE_OAUTH_REDIRECT = 'com.minti.app://auth/callback';

export const EMAIL_CODE_LENGTH = 6;

// Apple on the web needs a Services ID and key configured in the Supabase
// dashboard; without them the button only produces a 400. Native uses the
// bundle ID and needs no such setup, so the flag gates the web button alone.
export function appleWebSignInEnabled(): boolean {
  return process.env.NEXT_PUBLIC_APPLE_WEB_AUTH === 'true';
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  return getClient().auth.onAuthStateChange((_, session) => {
    callback(session?.user ?? null);
  });
}

// One call covers sign-in and sign-up: Supabase creates the user on first use,
// so the form never has to ask which one this is.
export async function sendEmailCode(email: string) {
  const { error } = await getClient().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyEmailCode(email: string, token: string) {
  const { data, error } = await getClient().auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
  return data;
}

// Legacy: accounts created before the code flow. There is deliberately no
// password sign-up counterpart — new accounts arrive via OAuth or a code, so
// nothing here has to send a confirmation email or explain one.
export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await getClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await getClient().auth.signOut();
  if (error) throw error;
}

async function startOAuth(provider: 'google' | 'apple') {
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
  await startOAuth('google');
}

export async function signInWithApple() {
  await startOAuth('apple');
}

export async function completeNativeOAuth(callbackUrl: string) {
  const params = new URL(callbackUrl).searchParams;

  const errorDescription = params.get('error_description') ?? params.get('error');
  if (errorDescription) {
    await Browser.close().catch(() => {});
    throw new Error(errorDescription);
  }

  const code = params.get('code');
  if (!code) return;

  const { error } = await getClient().auth.exchangeCodeForSession(code);
  await Browser.close().catch(() => {});
  if (error) throw error;
}

export type Passkey = {
  id: string;
  friendly_name?: string;
  created_at: string;
  last_used_at?: string;
};

// WebAuthn binds a credential to an origin's domain. The Capacitor shell serves
// the bundle from capacitor://localhost, which has no registrable domain to
// bind to, so the ceremony cannot complete there however it is called. Native
// already has Face ID over the session through lib/appLock.ts.
export function passkeysSupported(): boolean {
  if (typeof window === 'undefined' || isNative()) return false;
  return typeof window.PublicKeyCredential !== 'undefined';
}

// Dismissing the system sheet is a decision, not a failure; the caller should
// go quiet rather than show an error for it.
export function isPasskeyCeremonyAborted(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: string }).code === 'ERROR_CEREMONY_ABORTED'
  );
}

// The passkey methods report failure through `error` instead of throwing;
// rethrow so they behave like every other call in this module.
export async function signInWithPasskey() {
  const { error } = await getClient().auth.signInWithPasskey();
  if (error) throw error;
}

export async function registerPasskey() {
  const { error } = await getClient().auth.registerPasskey();
  if (error) throw error;
}

export async function listPasskeys(): Promise<Passkey[]> {
  const { data, error } = await getClient().auth.passkey.list();
  if (error) throw error;
  return data ?? [];
}

export async function deletePasskey(passkeyId: string) {
  const { error } = await getClient().auth.passkey.delete({ passkeyId });
  if (error) throw error;
}
