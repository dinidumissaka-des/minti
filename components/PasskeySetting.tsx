"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import Collapse from "@/components/ui/Collapse";
import { ListRow } from "@/components/ui/ListRow";
import { Button } from "@/components/ui/button";
import {
  listPasskeys,
  registerPasskey,
  deletePasskey,
  passkeysSupported,
  isPasskeyCeremonyAborted,
  type Passkey,
} from "@/lib/auth";

const PILL =
  "flex-1 h-12 rounded-full text-sm font-semibold transition-[color,background-color,border-color,transform] duration-fast ease-out active:scale-95";

function describe(passkeys: Passkey[], loading: boolean): string {
  if (loading) return "Checking…";
  if (passkeys.length === 0) return "Sign in with Face ID or Touch ID instead of a code";
  return passkeys.length === 1 ? "1 passkey on this account" : `${passkeys.length} passkeys on this account`;
}

// Enrolment lives here rather than on the sign-in screen on purpose: a passkey
// can only be created for an account that already exists, and gating the front
// door on one would turn away anyone on a shared or older device.
export default function PasskeySetting({ open }: { open: boolean }) {
  const [supported, setSupported] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(passkeysSupported());
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setPasskeys(await listPasskeys());
      setError(null);
    } catch {
      // A listing that fails should not accuse the user of anything; the row
      // simply offers to add one.
      setPasskeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !supported) return;
    void refresh();
  }, [open, supported, refresh]);

  useEffect(() => {
    if (!open) {
      setExpanded(false);
      setConfirmDelete(null);
      setError(null);
    }
  }, [open]);

  if (!supported) return null;

  async function handleAdd() {
    setError(null);
    setBusy(true);
    try {
      await registerPasskey();
      await refresh();
    } catch (err: unknown) {
      if (!isPasskeyCeremonyAborted(err)) {
        setError(err instanceof Error ? err.message : "Could not add that passkey.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    setBusy(true);
    try {
      await deletePasskey(id);
      setConfirmDelete(null);
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not remove that passkey.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ListRow
        icon={<KeyRound size={20} />}
        label="Passkey sign-in"
        description={describe(passkeys, loading)}
        trailing={<span />}
        onClick={() => {
          setExpanded((v) => !v);
          setConfirmDelete(null);
        }}
        aria-expanded={expanded}
      />
      <Collapse open={expanded}>
        <div className="px-4 py-3 flex flex-col gap-2">
          {passkeys.map((passkey) => (
            <div key={passkey.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="flex-1 min-w-0 flex flex-col">
                  <span className="text-body text-ink truncate">
                    {passkey.friendly_name || "Passkey"}
                  </span>
                  <span className="text-sm text-muted">
                    Added {new Date(passkey.created_at).toLocaleDateString()}
                  </span>
                </span>
                <button
                  onClick={() => setConfirmDelete(confirmDelete === passkey.id ? null : passkey.id)}
                  aria-label={`Remove ${passkey.friendly_name || "passkey"}`}
                  aria-expanded={confirmDelete === passkey.id}
                  className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full text-ink/40 hover:text-danger transition-[color,transform] duration-fast ease-out active:scale-90"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <Collapse open={confirmDelete === passkey.id}>
                <div className="flex items-center gap-2 pb-1">
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className={`${PILL} border flat-chip text-ink/60 hover:text-ink`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void handleDelete(passkey.id)}
                    disabled={busy}
                    className={`${PILL} bg-danger-fill/20 text-danger disabled:opacity-50`}
                  >
                    Remove
                  </button>
                </div>
              </Collapse>
            </div>
          ))}

          {error && (
            <p role="alert" className="text-danger text-sm">
              {error}
            </p>
          )}

          <Button onClick={() => void handleAdd()} disabled={busy} className="w-full">
            {busy ? "Waiting for your device…" : passkeys.length ? "Add another passkey" : "Set up a passkey"}
          </Button>
        </div>
      </Collapse>
    </>
  );
}
