"use client";

import { useState, useEffect, FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signIn, signUp, signInWithGoogle, signInWithApple } from "@/lib/supabase";
import { isNative } from "@/lib/platform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Collapse from "@/components/ui/Collapse";
import LogoMark from "@/components/LogoMark";

const MIN_PASSWORD = 6;

const SSO_BUTTON =
  "w-full h-control flex items-center justify-center gap-3 rounded-full border flat-chip text-body font-semibold text-ink transition-[color,background-color,border-color,transform] duration-fast ease-out active:scale-[0.98] disabled:opacity-50";

export default function AuthForm() {
  const [native, setNative] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signUpDone, setSignUpDone] = useState(false);

  useEffect(() => {
    setNative(isNative());
  }, []);

  function switchMode() {
    setMode(mode === "signin" ? "signup" : "signin");
    setError(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const emailVal = email.trim();
    if (!emailVal || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (mode === "signup" && password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signUp(emailVal, password);
        setSignUpDone(true);
      } else {
        await signIn(emailVal, password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (signUpDone) {
    return (
      <div className="min-h-[calc(100dvh-env(safe-area-inset-top))] flex flex-col justify-center px-6 py-12 pb-[calc(env(safe-area-inset-bottom)+5rem)] sm:min-h-0 sm:block sm:p-10 sm:pb-10 items-center text-center gap-4 sm:flex sm:flex-col sm:bg-sheet/85 sm:rounded-3xl sm:border sm:border-ink/10 animate-fade-slide-in">
        <LogoMark className="w-12 h-12" />
        <h1 className="font-fraunces text-3xl text-ink leading-tight">Check your inbox</h1>
        <p className="text-body text-muted max-w-[34ch]">
          We sent a confirmation link to{" "}
          <span className="text-ink font-semibold">{email.trim()}</span>. Open it to finish setting
          up your account.
        </p>
        <button
          onClick={() => {
            setMode("signin");
            setSignUpDone(false);
            setPassword("");
          }}
          className="mt-2 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-env(safe-area-inset-top))] flex flex-col justify-center px-6 py-12 pb-[calc(env(safe-area-inset-bottom)+5rem)] sm:min-h-0 sm:block sm:p-10 sm:pb-10 sm:bg-sheet/85 sm:rounded-3xl sm:border sm:border-ink/10">
      <div className="flex flex-col items-center text-center gap-3">
        <h1 className="font-fraunces text-[2rem] leading-[1.15] text-ink">Know where it goes.</h1>
        <p key={mode} className="text-body text-muted animate-fade-slide-in">
          {mode === "signin"
            ? "Sign in to pick up where you left off."
            : "Create an account to start tracking."}
        </p>
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

        {native && (
          <button type="button" onClick={() => signInWithApple()} className={SSO_BUTTON}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M14.94 9.57c-.02-2.1 1.71-3.11 1.79-3.16-.98-1.43-2.5-1.62-3.04-1.64-1.29-.13-2.52.76-3.18.76-.65 0-1.67-.74-2.74-.72-1.41.02-2.71.82-3.43 2.08-1.46 2.54-.37 6.3 1.05 8.36.7 1.01 1.53 2.14 2.62 2.1 1.05-.04 1.45-.68 2.72-.68 1.27 0 1.63.68 2.74.66 1.13-.02 1.85-1.03 2.54-2.04.8-1.17 1.13-2.3 1.15-2.36-.03-.01-2.2-.84-2.22-3.36zM12.86 3.4c.58-.7.97-1.68.86-2.65-.83.03-1.84.55-2.44 1.25-.53.62-1 1.61-.87 2.56.93.07 1.87-.47 2.45-1.16z" />
            </svg>
            Continue with Apple
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 my-6" aria-hidden="true">
        <div className="flex-1 h-px bg-ink/8" />
        <span className="text-xs text-muted font-semibold">or</span>
        <div className="flex-1 h-px bg-ink/8" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-xs text-muted font-semibold">Email</Label>
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

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="password" className="text-xs text-muted font-semibold">Password</Label>
            {mode === "signup" && (
              <span className="text-xs text-muted">At least {MIN_PASSWORD} characters</span>
            )}
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
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

        <Collapse open={!!error}>
          <p role="alert" className="text-danger text-sm">{error}</p>
        </Collapse>

        <Button type="submit" disabled={submitting} className="w-full mt-1">
          {submitting
            ? mode === "signin" ? "Signing in…" : "Creating account…"
            : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        {mode === "signin" ? "New to Minti?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={switchMode}
          className="font-semibold text-accent hover:text-accent/80 transition-colors"
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
