"use client";

import { useEffect, useState } from "react";
import { Bell, Coins, FileText, LogOut, Moon, Palette, ShieldCheck, Sun } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import Avatar, { displayName } from "@/components/Avatar";
import Collapse from "@/components/ui/Collapse";
import PushPage from "@/components/ui/PushPage";
import { ListRow, ListSection, RowToggle, RowValue } from "@/components/ui/ListRow";
import Switch from "@/components/ui/Switch";

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

// Replaces the "⋯" overflow menu. That menu mixed a month picker, a display
// setting, a nav destination already in the bottom bar, a utility, an export
// and sign-out into one flat list — six rows, six different kinds of thing.
// Month and currency moved onto the figures they describe; what is left is
// genuinely settings, so it is grouped and named like settings.
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
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    if (!open) setConfirmSignOut(false);
  }, [open]);

  return (
    <PushPage open={open} onClose={onClose} ariaLabel="Account">
      <div className="flex flex-col items-center gap-3 px-4 pt-4 pb-2">
        <Avatar user={user} size={112} />
        <h1 className="font-sans text-2xl font-bold text-ink text-center leading-tight">
          {displayName(user)}
        </h1>
        <span className="max-w-full truncate rounded-full border flat-chip px-3 h-8 flex items-center font-mono text-xs text-ink/60">
          {user?.email}
        </span>
      </div>

      <ListSection title="Your account">
        <ListRow
          icon={<FileText size={18} />}
          label="Statements and reports"
          description="Export your expenses as a CSV"
          onClick={onExportCSV}
        />
      </ListSection>

      <ListSection title="Settings">
        <ListRow
          icon={<Coins size={18} />}
          label="Currency"
          description="Used for every figure"
          trailing={<RowValue>{currency}</RowValue>}
          onClick={onCurrencyClick}
        />
        <ListRow
          icon={<Palette size={18} />}
          label="Appearance"
          description="Follows your device"
          trailing={
            <Switch
              on={theme === "dark"}
              onIcon={<Moon size={12} />}
              offIcon={<Sun size={12} />}
            />
          }
          onClick={onToggleTheme}
          role="switch"
          aria-checked={theme === "dark"}
        />
        {native && biometryAvailable && (
          <ListRow
            icon={<ShieldCheck size={18} />}
            label="Require Face ID"
            description="Unlock with Face ID or passcode"
            trailing={<RowToggle on={appLock} />}
            onClick={onToggleAppLock}
            role="switch"
            aria-checked={appLock}
          />
        )}
        {native && (
          <ListRow
            icon={<Bell size={18} />}
            label="Billing reminders"
            description="A nudge before each bill"
            trailing={<RowToggle on={billingReminders} />}
            onClick={onToggleBillingReminders}
            role="switch"
            aria-checked={billingReminders}
          />
        )}
      </ListSection>

      <ListSection title="Session">
        <ListRow
          icon={<LogOut size={18} />}
          label={confirmSignOut ? "Sign out of this account?" : "Sign out"}
          danger={!confirmSignOut}
          trailing={<span />}
          onClick={() => setConfirmSignOut((v) => !v)}
          aria-expanded={confirmSignOut}
        />
        {/* Sign out sat one row under Export CSV and fired on the first tap.
            It is the only irreversible row on the page, so it asks. */}
        <Collapse open={confirmSignOut}>
          <div className="px-4 py-3 flex items-center gap-2">
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
      </ListSection>
    </PushPage>
  );
}
