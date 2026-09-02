"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft } from "lucide-react";

// Which pages are open, oldest first. Pages portal to <body>, so a page opened
// from another page is a DOM sibling rather than a descendant — there is no
// tree to read depth from, the same reason BottomDrawer keeps a stack.
let openStack: string[] = [];
const EMPTY: string[] = [];
const closers = new Map<string, () => void>();
const listeners = new Set<() => void>();
// Back presses we made ourselves, unwinding the entry of a page that was
// closed from its own back button. Without this the pop would travel on and
// close the page underneath as well.
let suppressed = 0;
let popInstalled = false;

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function installPopHandler() {
  if (popInstalled || typeof window === "undefined") return;
  window.addEventListener("popstate", () => {
    if (suppressed > 0) {
      suppressed -= 1;
      return;
    }
    const top = openStack[openStack.length - 1];
    if (top) closers.get(top)?.();
  });
  popInstalled = true;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Rendered under the back button. Omit for a page that titles itself. */
  title?: string;
  ariaLabel: string;
  children: React.ReactNode;
}

// A screen you navigated to: in from the right, out under a back arrow, and
// holding a history entry so the hardware and browser back buttons close it.
export default function PushPage({ open, onClose, title, ariaLabel, children }: Props) {
  const [mounted, setMounted] = useState(false);
  const id = useId();
  const pageRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const stack = useSyncExternalStore(subscribe, () => openStack, () => EMPTY);
  const isTop = stack[stack.length - 1] === id;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    installPopHandler();
    closers.set(id, () => closeRef.current());
    openStack = [...openStack, id];
    emit();
    window.history.pushState({ mintiPage: id }, "");
    return () => {
      openStack = openStack.filter((x) => x !== id);
      closers.delete(id);
      emit();
      // Only unwind our own entry: if a back press already popped it, the
      // state on top belongs to someone else and is not ours to touch.
      if (window.history.state?.mintiPage === id) {
        suppressed += 1;
        window.history.back();
      }
    };
  }, [open, id]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !isTop) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isTop]);

  // Set as an attribute rather than a prop: React 18's types don't know
  // `inert`, and a page parked off-screen must not stay in the tab order.
  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    if (open) el.removeAttribute("inert");
    else el.setAttribute("inert", "");
  }, [open, mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={pageRef}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-hidden={!open}
      className={`fixed inset-0 z-page overflow-y-auto overflow-x-hidden bg-background transition-transform duration-slow ease-out ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* px-2 is the gutter the pressed row highlight sits in — without it a
          row's rounded fill runs into both screen edges. Children keep their
          own px-4, so content lands 24px in and the fill 8px in. */}
      <div
        className="max-w-2xl mx-auto px-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 3rem)" }}
      >
        <div className="px-4" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}>
          <button
            onClick={onClose}
            aria-label="Back"
            className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full bg-surface border border-ink/10 text-ink transition-transform duration-fast active:scale-90"
          >
            <ArrowLeft size={18} />
          </button>
          {/* Under the arrow rather than beside it: on its own line the title
              has the width to be a heading instead of a label squeezed next to
              a control. */}
          {title && <h1 className="mt-4 font-sans text-3xl font-bold text-ink">{title}</h1>}
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
