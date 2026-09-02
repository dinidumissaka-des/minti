"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Moon, Sun } from "lucide-react";
import BottomDrawer from "@/components/BottomDrawer";
import Collapse from "@/components/ui/Collapse";

interface Props {
  open: boolean;
  onClose: () => void;
  email: string | undefined;
  currency: string;
  onCurrencyClick: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  privacyMode: boolean;
  onTogglePrivacy: () => void;
  native: boolean;
  biometryAvailable: boolean;
  appLock: boolean;
  onToggleAppLock: () => void;
  billingReminders: boolean;
  onToggleBillingReminders: () => void;
  onExportCSV: () => void;
  onSignOut: () => void;
}

const ROW = "w-full flex items-center justify-between gap-3 px-4 py-4 text-body rounded-xl hover:bg-ink/7 transition-[background-color,transform] duration-fast active:scale-[0.98]";
// The label is the row's subject and the value its answer, so the label reads
// at full strength and the value dims — the menu this replaced had it the other
// way round, which made every label look disabled.
const LABEL = "text-ink";
const VALUE = "flex items-center gap-1.5 font-mono text-sm text-ink/50";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pt-4 first:pt-1">
      <h3 className="px-4 pb-1 font-sans text-xs text-muted font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`font-mono text-xs font-semibold ${on ? "text-accent" : "text-ink/40"}`}>
      {on ? "ON" : "OFF"}
    </span>
  );
}

// Replaces the "⋯" overflow menu. That menu mixed a month picker, a display
// setting, a nav destination already in the bottom bar, a utility, an export
// and sign-out into one flat list — six rows, six different kinds of thing.
// Month and currency moved onto the figures they describe; what is left is
// genuinely settings, so it is grouped and named like settings.
export default function SettingsSheet({
  open,
  onClose,
  email,
  currency,
  onCurrencyClick,
  theme,
  onToggleTheme,
  privacyMode,
  onTogglePrivacy,
  native,
  biometryAvailable,
  appLock,
  onToggleAppLock,
  billingReminders,
  onToggleBillingReminders,
  onExportCSV,
  onSignOut,
}: Props) {
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    if (!open) setConfirmSignOut(false);
  }, [open]);

  return (
    <BottomDrawer open={open} onClose={onClose} title="Settings">
      <Group title="Account">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-ink/10 font-sans text-sm font-semibold text-ink">
            {(email?.[0] ?? "?").toUpperCase()}
          </span>
          <span className="text-body text-ink truncate">{email ?? "Signed in"}</span>
        </div>
      </Group>

      <Group title="Preferences">
        <button onClick={onCurrencyClick} className={ROW}>
          <span className={LABEL}>Currency</span>
          <span className={VALUE}>
            {currency}
            <ChevronRight size={14} className="text-ink/40" />
          </span>
        </button>
        <button onClick={onToggleTheme} className={ROW}>
          <span className={LABEL}>Appearance</span>
          <span className={VALUE}>
            {theme === "dark" ? "Dark" : "Light"}
            {theme === "dark" ? <Moon size={14} className="text-ink/40" /> : <Sun size={14} className="text-ink/40" />}
          </span>
        </button>
        <button onClick={onTogglePrivacy} role="switch" aria-checked={privacyMode} className={ROW}>
          <span className={LABEL}>Hide amounts</span>
          <Toggle on={privacyMode} />
        </button>
        {native && biometryAvailable && (
          <button onClick={onToggleAppLock} role="switch" aria-checked={appLock} className={ROW}>
            <span className={LABEL}>Require Face ID</span>
            <Toggle on={appLock} />
          </button>
        )}
        {native && (
          <button onClick={onToggleBillingReminders} role="switch" aria-checked={billingReminders} className={ROW}>
            <span className={LABEL}>Billing reminders</span>
            <Toggle on={billingReminders} />
          </button>
        )}
      </Group>

      <Group title="Data">
        <button onClick={onExportCSV} className={ROW}>
          <span className={LABEL}>Export CSV</span>
          <ChevronRight size={14} className="text-ink/40" />
        </button>
      </Group>

      <Group title="Session">
        <button
          onClick={() => setConfirmSignOut((v) => !v)}
          aria-expanded={confirmSignOut}
          className={ROW}
        >
          <span className={confirmSignOut ? "text-ink" : "text-danger"}>
            {confirmSignOut ? "Sign out of this account?" : "Sign out"}
          </span>
        </button>
        {/* Sign out sat one row under Export CSV and fired on the first tap.
            It is the only irreversible row in the sheet, so it asks. */}
        <Collapse open={confirmSignOut}>
          <div className="px-4 pt-1 pb-2 flex items-center gap-2">
            <button
              onClick={() => setConfirmSignOut(false)}
              className="flex-1 h-11 rounded-full border flat-chip text-ink/60 hover:text-ink text-sm font-semibold transition-[color,background-color,border-color,transform] duration-fast active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={onSignOut}
              className="flex-1 h-11 rounded-full bg-danger-fill/20 text-danger text-sm font-semibold transition-[background-color,transform] duration-fast active:scale-95"
            >
              Sign out
            </button>
          </div>
        </Collapse>
      </Group>
    </BottomDrawer>
  );
}
