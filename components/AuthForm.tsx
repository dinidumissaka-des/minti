"use client";

import { useState, useEffect, FormEvent } from "react";
import { signIn, signUp, signInWithGoogle, signInWithApple } from "@/lib/supabase";
import { isNative } from "@/lib/platform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Collapse from "@/components/ui/Collapse";
import Logo from "@/components/Logo";

export default function AuthForm() {
  const [native, setNative] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNative(isNative());
  }, []);
  const [signUpDone, setSignUpDone] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const emailVal = (data.get("email") as string).trim();
    const passwordVal = data.get("password") as string;
    if (!emailVal || !passwordVal) {
      setError("Please fill in all fields.");
      return;
    }
    setEmail(emailVal);
    setPassword(passwordVal);
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signUp(emailVal, passwordVal);
        setSignUpDone(true);
      } else {
        await signIn(emailVal, passwordVal);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (signUpDone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] px-6 gap-3 text-center sm:min-h-0 sm:bg-ink/7 sm:rounded-2xl sm:border sm:border-ink/10 sm:p-8 animate-fade-slide-in">
        <p className="font-sans font-semibold text-xl text-ink">Check your email</p>
        <p className="font-sans text-base text-muted">
          We sent a confirmation link to <span className="text-ink font-medium">{email}</span>.
        </p>
        <button
          onClick={() => { setMode("signin"); setSignUpDone(false); }}
          className="mt-2 text-sm font-mono text-accent underline hover:text-accent/80"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col min-h-[100dvh] px-6 sm:min-h-0 sm:bg-ink/7 sm:rounded-2xl sm:border sm:border-ink/10 sm:p-8 sm:gap-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+2.5rem)]"
    >
      {/* Logo + title */}
      <div className="flex items-center gap-3">
        <Logo className="h-5 w-auto flex-shrink-0" />
        <span className="text-ink/20">•</span>
        <h1 key={mode} className="font-sans font-semibold text-xl text-ink animate-fade-slide-in">
          {mode === "signin" ? "Sign in" : "Sign up"}
        </h1>
      </div>

      {/* Inputs — vertically centered on mobile, normal flow on desktop */}
      <div className="flex-1 flex flex-col justify-center gap-5 sm:flex-none">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="font-mono text-xs text-muted font-semibold">Email</Label>
          <Input
            id="email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="font-mono text-xs text-muted font-semibold">Password</Label>
          <Input
            id="password"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <Collapse open={!!error}>
          <p className="text-danger text-sm font-mono">{error}</p>
        </Collapse>
      </div>

      {/* CTA — pinned to bottom on mobile, normal flow on desktop */}
      <div className="flex flex-col gap-3">
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? (mode === "signin" ? "Signing in…" : "Signing up…") : mode === "signin" ? "Sign In" : "Sign Up"}
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-ink/8" />
          <span className="text-xs text-muted font-mono">or</span>
          <div className="flex-1 h-px bg-ink/8" />
        </div>

        {native && (
          <button
            type="button"
            onClick={() => signInWithApple()}
            className="w-full h-11 flex items-center justify-center gap-3 rounded-full border border-ink/10 bg-ink/5 hover:bg-ink/10 transition-colors text-sm font-medium text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M14.94 9.57c-.02-2.1 1.71-3.11 1.79-3.16-.98-1.43-2.5-1.62-3.04-1.64-1.29-.13-2.52.76-3.18.76-.65 0-1.67-.74-2.74-.72-1.41.02-2.71.82-3.43 2.08-1.46 2.54-.37 6.3 1.05 8.36.7 1.01 1.53 2.14 2.62 2.1 1.05-.04 1.45-.68 2.72-.68 1.27 0 1.63.68 2.74.66 1.13-.02 1.85-1.03 2.54-2.04.8-1.17 1.13-2.3 1.15-2.36-.03-.01-2.2-.84-2.22-3.36zM12.86 3.4c.58-.7.97-1.68.86-2.65-.83.03-1.84.55-2.44 1.25-.53.62-1 1.61-.87 2.56.93.07 1.87-.47 2.45-1.16z" />
            </svg>
            Continue with Apple
          </button>
        )}

        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className="w-full h-11 flex items-center justify-center gap-3 rounded-full border border-ink/10 bg-ink/5 hover:bg-ink/10 transition-colors text-sm font-medium text-ink"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-sm font-mono text-muted">
          {mode === "signin" ? "No account?" : "Already have one?"}{" "}
          <button
            type="button"
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
            className="text-accent underline hover:text-accent/80"
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </form>
  );
}
