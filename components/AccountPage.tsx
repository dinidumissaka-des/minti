"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Coins,
  FileText,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import Avatar, { displayName } from "@/components/Avatar";
import Collapse from "@/components/ui/Collapse";
import { CURRENCIES } from "@/lib/currencies";

interface Props {
  open: boolean;
  onClose: () => void;
  user: User | null;
  currency: string;
  onCurrencyClick: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  native: boolean;
  biometryAvailable: boolean;
  appLock: boolean;
  onToggleAppLock: () => void;
  billingReminders: boolean;
  onToggleBillingReminders: () => void;
  onExportCSV: () => void;
  onSignOut: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pt-7 first:pt-2">
      <h2 className="px-4 pb-2 font-sans text-xl font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Row({
  icon,
  label,
  description,
  trailing,
  onClick,
  danger,
  ...rest
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  trailing?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-ink/7 transition-[background-color,transform] duration-fast active:scale-[0.98]"
      {...rest}
    >
      <span
        className={`w-12 h-12 shrink-0 flex items-center justify-center rounded-full border ${
          danger ? "border-danger-fill/30 text-danger" : "border-ink/15 text-ink"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0 flex flex-col items-start text-left">
        <span className={`text-body font-semibold ${danger ? "text-danger" : "text-ink"}`}>{label}</span>
        {description && <span className="text-sm text-muted truncate max-w-full">{description}</span>}
      </span>
      {trailing ?? <ChevronRight size={16} className="text-ink/40" />}
    </button>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`font-mono text-xs font-semibold ${on ? "text-accent" : "text-ink/40"}`}>
      {on ? "ON" : "OFF"}
    </span>
  );
}

// A pushed page, not a sheet: it is where the account lives, so it arrives the
// way a screen does — in from the right, out under a back arrow — and takes a
// history entry with it so the hardware and browser back buttons close it.
export default function AccountPage({
  open,
  onClose,
  user,
  currency,
  onCurrencyClick,
  theme,
  onToggleTheme,
  native,
  biometryAvailable,
  appLock,
  onToggleAppLock,
  billingReminders,
  onToggleBillingReminders,
  onExportCSV,
  onSignOut,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) return;
    setConfirmSignOut(false);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [open]);

  // Set as an attribute rather than a prop: React 18's types don't know
  // `inert`, and a page parked off-screen must not stay in the tab order.
  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    if (open) el.removeAttribute("inert");
    else el.setAttribute("inert", "");
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Back closes the page rather than leaving the app. The cleanup pops the
  // entry again when the page is closed from the UI, so the two routes out
  // leave the history in the same place.
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ mintiAccount: true }, "");
    function onPop() {
      closeRef.current();
    }
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (window.history.state?.mintiAccount) window.history.back();
    };
  }, [open]);

  if (!mounted) return null;

  const currencyName = CURRENCIES.find((c) => c.code === currency)?.name;

  return createPortal(
    <div
      ref={(node) => {
        scrollRef.current = node;
        pageRef.current = node;
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Account"
      aria-hidden={!open}
      className={`fixed inset-0 z-page overflow-y-auto overflow-x-hidden bg-background transition-transform duration-slow ease-out ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* px-2 is the gutter the pressed/hovered row highlight sits in — without
          it the row's rounded fill runs into both screen edges. Everything
          inside keeps its own px-4, so content lands 24px in and the fill 8px
          in, the same relationship the drawer rows have. */}
      <div
        className="max-w-2xl mx-auto px-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 3rem)" }}
      >
        <div className="px-4" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}>
          <button
            onClick={onClose}
            aria-label="Back"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-surface border border-ink/10 text-ink transition-transform duration-fast active:scale-90"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 px-6 pt-4 pb-2">
          <Avatar user={user} size={112} />
          <h1 className="font-sans text-2xl font-bold text-ink text-center leading-tight">
            {displayName(user)}
          </h1>
          <span className="max-w-full truncate rounded-full border flat-chip px-3 h-8 flex items-center font-mono text-xs text-ink/60">
            {user?.email}
          </span>
        </div>

        <Section title="Your account">
          <Row
            icon={<FileText size={18} />}
            label="Statements and reports"
            description="Export your expenses as a CSV"
            onClick={onExportCSV}
          />
        </Section>

        <Section title="Settings">
          <Row
            icon={<Coins size={18} />}
            label="Currency"
            description={currencyName}
            trailing={<span className="font-mono text-sm text-ink/50">{currency}</span>}
            onClick={onCurrencyClick}
          />
          <Row
            icon={theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
            label="Appearance"
            description="Follows your device by default"
            trailing={<span className="font-mono text-sm text-ink/50">{theme === "dark" ? "Dark" : "Light"}</span>}
            onClick={onToggleTheme}
          />
          {native && biometryAvailable && (
            <Row
              icon={<ShieldCheck size={18} />}
              label="Require Face ID"
              description="Unlock with Face ID or passcode"
              trailing={<Toggle on={appLock} />}
              onClick={onToggleAppLock}
              role="switch"
              aria-checked={appLock}
            />
          )}
          {native && (
            <Row
              icon={<Bell size={18} />}
              label="Billing reminders"
              description="A nudge before each bill"
              trailing={<Toggle on={billingReminders} />}
              onClick={onToggleBillingReminders}
              role="switch"
              aria-checked={billingReminders}
            />
          )}
        </Section>

        <Section title="Session">
          <Row
            icon={<LogOut size={18} />}
            label={confirmSignOut ? "Sign out of this account?" : "Sign out"}
            danger={!confirmSignOut}
            trailing={<span />}
            onClick={() => setConfirmSignOut((v) => !v)}
            aria-expanded={confirmSignOut}
          />
          <Collapse open={confirmSignOut}>
            <div className="px-4 pt-1 flex items-center gap-2">
              <button
                onClick={() => setConfirmSignOut(false)}
                className="flex-1 h-12 rounded-full border flat-chip text-ink/60 hover:text-ink text-sm font-semibold transition-[color,background-color,border-color,transform] duration-fast active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={onSignOut}
                className="flex-1 h-12 rounded-full bg-danger-fill/20 text-danger text-sm font-semibold transition-[background-color,transform] duration-fast active:scale-95"
              >
                Sign out
              </button>
            </div>
          </Collapse>
        </Section>
      </div>
    </div>,
    document.body
  );
}
