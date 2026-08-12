"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { Lock } from "lucide-react";
import Logo from "@/components/Logo";
import { authenticate, isAppLockEnabled } from "@/lib/appLock";
import { isNative } from "@/lib/platform";

export default function AppLock() {
  const [locked, setLocked] = useState(false);
  const [prompting, setPrompting] = useState(false);
  const lockedRef = useRef(false);
  const promptingRef = useRef(false);

  const lock = useCallback(() => {
    lockedRef.current = true;
    setLocked(true);
  }, []);

  const unlock = useCallback(async () => {
    if (promptingRef.current) return;
    promptingRef.current = true;
    setPrompting(true);
    const ok = await authenticate();
    promptingRef.current = false;
    setPrompting(false);
    if (ok) {
      lockedRef.current = false;
      setLocked(false);
    }
  }, []);

  useEffect(() => {
    if (!isNative()) return;
    let cancelled = false;

    isAppLockEnabled().then((enabled) => {
      if (cancelled || !enabled) return;
      lock();
      unlock();
    });

    const handle = App.addListener("appStateChange", async ({ isActive }) => {
      if (!isActive) {
        if (await isAppLockEnabled()) lock();
        return;
      }
      if (lockedRef.current) unlock();
    });

    return () => {
      cancelled = true;
      handle.then((h) => h.remove());
    };
  }, [lock, unlock]);

  if (!locked) return null;

  return (
    <div
      className="fixed inset-0 z-lock flex flex-col items-center justify-center gap-8 px-6"
      style={{ backgroundColor: "rgb(var(--background))" }}
    >
      <Logo />
      <button
        onClick={unlock}
        disabled={prompting}
        className="flex items-center gap-2 h-11 px-5 rounded-full border flat-chip text-ink/60 hover:text-ink disabled:opacity-50 transition-colors text-sm font-semibold"
      >
        <Lock size={14} />
        {prompting ? "Unlocking…" : "Unlock"}
      </button>
    </div>
  );
}
