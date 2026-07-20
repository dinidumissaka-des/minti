"use client";

import { useState, FormEvent } from "react";
import { signIn, signUp, signInWithGoogle } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/Logo";

export default function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      <div className="flex flex-col items-center justify-center min-h-[100dvh] px-6 gap-3 text-center sm:min-h-0 sm:bg-white/[0.07] sm:rounded-2xl sm:border sm:border-white/[0.1] sm:p-8">
        <p className="font-sans font-semibold text-xl text-white">Check your email</p>
        <p className="font-sans text-base text-muted">
          We sent a confirmation link to <span className="text-white font-medium">{email}</span>.
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
      className="flex flex-col min-h-[100dvh] px-6 sm:min-h-0 sm:bg-white/[0.07] sm:rounded-2xl sm:border sm:border-white/[0.1] sm:p-8 sm:gap-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+2.5rem)]"
    >
      {/* Logo + title */}
      <div className="flex items-center gap-3">
        <Logo className="h-5 w-auto flex-shrink-0" />
        <span className="text-white/20">•</span>
        <h1 className="font-sans font-semibold text-xl text-white">
          {mode === "signin" ? "Sign in" : "Sign up"}
        </h1>
      </div>

      {/* Inputs — vertically centered on mobile, normal flow on desktop */}
      <div className="flex-1 flex flex-col justify-center gap-5 sm:flex-none">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="font-mono text-xs text-muted uppercase tracking-widest font-semibold">Email</Label>
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
          <Label htmlFor="password" className="font-mono text-xs text-muted uppercase tracking-widest font-semibold">Password</Label>
          <Input
            id="password"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-danger text-sm font-mono">{error}</p>}
      </div>

      {/* CTA — pinned to bottom on mobile, normal flow on desktop */}
      <div className="flex flex-col gap-3">
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? (mode === "signin" ? "Signing in…" : "Signing up…") : mode === "signin" ? "Sign In" : "Sign Up"}
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/[0.08]" />
          <span className="text-xs text-muted font-mono">or</span>
          <div className="flex-1 h-px bg-white/[0.08]" />
        </div>

        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className="w-full h-11 flex items-center justify-center gap-3 rounded-xl border border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.1] transition-colors text-sm font-medium text-white"
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
