"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { Eye, EyeOff, ArrowLeft, KeyRound } from "lucide-react";
import {
  sendEmailCode,
  verifyEmailCode,
  signInWithPassword,
  signInWithGoogle,
  signInWithApple,
  signInWithPasskey,
  passkeysSupported,
  isPasskeyCeremonyAborted,
  appleWebSignInEnabled,
  EMAIL_CODE_LENGTH,
} from "@/lib/auth";
import { isNative } from "@/lib/platform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Collapse from "@/components/ui/Collapse";

const RESEND_SECONDS = 30;

const SHELL =
  "min-h-[calc(100dvh-env(safe-area-inset-top))] flex flex-col justify-center px-6 py-12 pb-[calc(env(safe-area-inset-bottom)+5rem)] sm:min-h-0 sm:block sm:p-10 sm:pb-10 sm:bg-surface sm:rounded-3xl sm:border sm:border-ink/10";

const SSO_BUTTON =
  "w-full h-control flex items-center justify-center gap-3 rounded-full border flat-chip text-body font-semibold text-ink transition-[color,background-color,border-color,transform] duration-fast ease-out active:scale-[0.98] disabled:opacity-50";

const TEXT_LINK = "font-semibold text-accent hover:text-accent/80 transition-colors";

const BACK_LINK =
  "flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-[color,transform] duration-fast ease-out active:scale-95 mb-6";

// Supabase surfaces its own strings; the only one worth rewriting everywhere is
// the throttle, which otherwise arrives as "For security purposes…".
function readableError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (!message) return "Something went wrong. Try again.";
  if (/rate limit|too many|security purposes/i.test(message)) {
    return "Too many attempts. Wait a moment and try again.";
  }
  return message;
}

type Step = "identify" | "code" | "password";

export default function AuthForm() {
  const [native, setNative] = useState(false);
  const [canPasskey, setCanPasskey] = useState(false);
  const [step, setStep] = useState<Step>("identify");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  // Without this the auto-submit effect re-fires the same rejected code for as
  // long as it stays six digits long.
  const attemptedCode = useRef<string | null>(null);

  useEffect(() => {
    setNative(isNative());
    setCanPasskey(passkeysSupported());
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function requestCode(target: string) {
    setError(null);
    setSubmitting(true);
    try {
      await sendEmailCode(target);
      attemptedCode.current = null;
      setCode("");
      setStep("code");
      setResendIn(RESEND_SECONDS);
    } catch (err: unknown) {
      setError(readableError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCode(token: string) {
    setError(null);
    setSubmitting(true);
    try {
      await verifyEmailCode(email.trim(), token);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      setError(
        /expired|invalid/i.test(message)
          ? "That code has expired or isn't right. Request a new one."
          : readableError(err),
      );
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (step !== "code" || code.length !== EMAIL_CODE_LENGTH) return;
    if (attemptedCode.current === code) return;
    attemptedCode.current = code;
    void submitCode(code);
    // submitCode reads only what `code` and `email` already pin down.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  function handleCodeChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, EMAIL_CODE_LENGTH);
    // Retyping the same code after a rejection has to be allowed to resubmit.
    if (digits.length < EMAIL_CODE_LENGTH) attemptedCode.current = null;
    setCode(digits);
  }

  function handleEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const target = email.trim();
    if (!target) {
      setError("Enter your email address.");
      return;
    }
    void requestCode(target);
  }

  async function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const target = email.trim();
    if (!target || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signInWithPassword(target, password);
    } catch (err: unknown) {
      setError(readableError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasskey() {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithPasskey();
    } catch (err: unknown) {
      // Dismissing the system sheet is a choice, not a failure.
      if (!isPasskeyCeremonyAborted(err)) setError(readableError(err));
    } finally {
      setSubmitting(false);
    }
  }

  function goTo(next: Step) {
    setStep(next);
    setError(null);
  }

  const errorSlot = (
    <Collapse open={!!error}>
      <p role="alert" className="text-danger text-sm">
        {error}
      </p>
    </Collapse>
  );

  const emailField = (
    <div className="flex flex-col gap-2">
      <Label htmlFor="email" className="text-xs text-muted font-semibold">
        Email
      </Label>
      <Input
        id="email"
        type="email"
        name="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="you@example.com"
      />
    </div>
  );

  if (step === "code") {
    return (
      <div className={SHELL}>
        <button type="button" onClick={() => goTo("identify")} className={BACK_LINK}>
          <ArrowLeft size={16} />
          Use a different email
        </button>

        <div className="flex flex-col items-center text-center gap-3">
          <h1 className="font-fraunces text-[2rem] leading-[1.15] text-ink animate-fade-slide-in">
            Enter your code
          </h1>
          <p className="text-body text-muted max-w-[34ch]">
            We sent a {EMAIL_CODE_LENGTH}-digit code to{" "}
            <span className="text-ink font-semibold">{email.trim()}</span>.
          </p>
        </div>

        <div className="flex flex-col gap-4 mt-8">
          <Label htmlFor="code" className="sr-only">
            Verification code
          </Label>
          <Input
            id="code"
            name="code"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            aria-label="Verification code"
            placeholder="000000"
            className="text-center text-2xl font-semibold tracking-[0.5em] pl-[0.5em]"
          />

          {errorSlot}

          <p className="text-center text-sm text-muted" aria-live="polite">
            {submitting ? (
              "Checking your code…"
            ) : resendIn > 0 ? (
              `Didn't get it? Resend in ${resendIn}s`
            ) : (
              <>
                Didn&apos;t get it?{" "}
                <button
                  type="button"
                  onClick={() => void requestCode(email.trim())}
                  className={TEXT_LINK}
                >
                  Send a new code
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  // Kept only so accounts made before the code flow still open. New accounts
  // never take this path, which is why there is no sign-up half to it.
  if (step === "password") {
    return (
      <div className={SHELL}>
        <button type="button" onClick={() => goTo("identify")} className={BACK_LINK}>
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="flex flex-col items-center text-center gap-3">
          <h1 className="font-fraunces text-[2rem] leading-[1.15] text-ink animate-fade-slide-in">
            Welcome back
          </h1>
          <p className="text-body text-muted">Sign in with your existing password.</p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 mt-8">
          {emailField}

          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-xs text-muted font-semibold">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full text-ink/40 hover:text-ink/90 transition-[color,transform] duration-fast ease-out active:scale-90"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {errorSlot}

          <Button type="submit" disabled={submitting} className="w-full mt-1">
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Forgotten it, or new here?{" "}
          <button type="button" onClick={() => goTo("identify")} className={TEXT_LINK}>
            Sign in with a code
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className={SHELL}>
      <div className="flex flex-col items-center text-center gap-3">
        <h1 className="font-fraunces text-[2rem] leading-[1.15] text-ink animate-fade-slide-in">
          Welcome to Minti
        </h1>
        <p className="text-body text-muted">Sign in or create your account — no password needed.</p>
      </div>

      {/* The fast path first — most people never reach the form below it. */}
      <div className="flex flex-col gap-2.5 mt-9">
        <button type="button" onClick={() => signInWithGoogle()} className={SSO_BUTTON}>
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {(native || appleWebSignInEnabled()) && (
          <button type="button" onClick={() => signInWithApple()} className={SSO_BUTTON}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M14.94 9.57c-.02-2.1 1.71-3.11 1.79-3.16-.98-1.43-2.5-1.62-3.04-1.64-1.29-.13-2.52.76-3.18.76-.65 0-1.67-.74-2.74-.72-1.41.02-2.71.82-3.43 2.08-1.46 2.54-.37 6.3 1.05 8.36.7 1.01 1.53 2.14 2.62 2.1 1.05-.04 1.45-.68 2.72-.68 1.27 0 1.63.68 2.74.66 1.13-.02 1.85-1.03 2.54-2.04.8-1.17 1.13-2.3 1.15-2.36-.03-.01-2.2-.84-2.22-3.36zM12.86 3.4c.58-.7.97-1.68.86-2.65-.83.03-1.84.55-2.44 1.25-.53.62-1 1.61-.87 2.56.93.07 1.87-.47 2.45-1.16z" />
            </svg>
            Continue with Apple
          </button>
        )}

        {/* Last in the stack deliberately: it only works once a passkey has
            been enrolled from the account page, so it cannot lead. */}
        {canPasskey && (
          <button
            type="button"
            onClick={() => void handlePasskey()}
            disabled={submitting}
            className={SSO_BUTTON}
          >
            <KeyRound size={18} />
            Sign in with a passkey
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 my-6" aria-hidden="true">
        <div className="flex-1 h-px bg-ink/8" />
        <span className="text-xs text-muted font-semibold">or</span>
        <div className="flex-1 h-px bg-ink/8" />
      </div>

      <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
        {emailField}

        {errorSlot}

        <Button type="submit" disabled={submitting} className="w-full mt-1">
          {submitting ? "Sending code…" : "Continue with email"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        We&apos;ll email you a {EMAIL_CODE_LENGTH}-digit code — no password to remember.{" "}
        <button type="button" onClick={() => goTo("password")} className={TEXT_LINK}>
          Use a password instead
        </button>
      </p>
    </div>
  );
}
