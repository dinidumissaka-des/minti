"use client";

import { useEffect, useState } from "react";
import { X, Share } from "lucide-react";
import Logo from "@/components/Logo";
import { isNative } from "@/lib/platform";

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState<Event & { prompt?: () => void } | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isNative()) return;
    if (localStorage.getItem("minti_install_dismissed")) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as Record<string, unknown>).MSStream;
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (standalone) return;

    if (ios) {
      setIsIOS(true);
      setDismissed(false);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as Event & { prompt?: () => void });
      setDismissed(false);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem("minti_install_dismissed", "1");
    setDismissed(true);
  }

  async function install() {
    if (prompt?.prompt) await prompt.prompt();
    dismiss();
  }

  if (dismissed) return null;

  return (
    <div
      className="fixed left-4 right-4 max-w-2xl mx-auto z-[55] animate-fade-slide-in"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
    >
      <div
        className="flex items-center gap-3 px-3 py-3 rounded-2xl border border-ink/10 backdrop-blur-2xl shadow-2xl"
        style={{ backgroundColor: "rgb(var(--background) / 0.9)" }}
      >
        {/* App icon */}
        <div className="w-10 h-10 rounded-xl bg-accent-fill/15 border border-accent-fill/25 flex items-center justify-center flex-shrink-0">
          <Logo className="h-3.5 w-auto" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink leading-tight">Add to Home Screen</p>
          {isIOS ? (
            <p className="text-xs text-ink/40 mt-0.5 flex items-center gap-1 flex-wrap">
              Tap <Share size={10} className="text-accent inline" /> then
              <span className="text-accent font-medium">Add to Home Screen</span>
            </p>
          ) : (
            <p className="text-xs text-ink/40 mt-0.5">Get the full app experience</p>
          )}
        </div>

        {/* Install button (non-iOS) */}
        {!isIOS && (
          <button
            onClick={install}
            className="flex-shrink-0 h-11 px-5 rounded-full bg-accent-fill text-accent-on text-sm font-semibold hover:bg-accent-fill/90 transition-colors"
          >
            Install
          </button>
        )}

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-ink/7 border border-ink/8 text-ink/30 hover:text-ink/70 transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
