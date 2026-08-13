"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { hapticTap } from "@/lib/haptics";

// Which drawers are open, oldest first. Drawers portal to <body>, so a nested
// one (the date picker inside the mobile Add Expense sheet) is a DOM sibling of
// its parent rather than a descendant — there is no tree to read depth from.
// A module-level stack is the only thing both of them can see.
let openStack: string[] = [];
const EMPTY: string[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function pushDrawer(id: string) {
  if (openStack.includes(id)) return;
  openStack = [...openStack, id];
  emit();
}

function removeDrawer(id: string) {
  if (!openStack.includes(id)) return;
  openStack = openStack.filter((x) => x !== id);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  contentClassName?: string;
  fullScreen?: boolean;
}

// Past this much of the sheet's own height, or this fast, the release dismisses.
const DISMISS_RATIO = 0.28;
const DISMISS_VELOCITY = 0.5;

export default function BottomDrawer({ open, onClose, title, children, contentClassName, fullScreen }: Props) {
  // Portalled to body because the sheet animates with translate-y, and a
  // transform makes position:fixed descendants resolve against it instead of
  // the viewport. Without this a drawer opened from inside another drawer
  // (the date/category pickers in AddExpenseForm) lays itself out inside its
  // parent sheet.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const id = useId();
  const stack = useSyncExternalStore(subscribe, () => openStack, () => EMPTY);

  useEffect(() => {
    if (open) pushDrawer(id);
    else removeDrawer(id);
  }, [open, id]);

  useEffect(() => () => removeDrawer(id), [id]);

  const isTop = stack[stack.length - 1] === id;
  // Open, but another sheet is stacked on top of it.
  const isBehind = open && !isTop;

  const sheetRef = useRef<HTMLDivElement>(null);

  // Sheets sit above the scrim, so a sheet left behind stays reachable around
  // the front sheet's edges — clickable, and still in the tab order. Set as an
  // attribute rather than a prop: React 18's types don't know `inert`.
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    if (isBehind) el.setAttribute("inert", "");
    else el.removeAttribute("inert");
  }, [isBehind]);
  const [drag, setDrag] = useState(0);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startTime = useRef(0);

  useEffect(() => {
    if (!open) setDrag(0);
  }, [open]);

  // The grabber has always looked draggable. Only the header area starts a
  // drag — the body scrolls, and a sheet that follows the finger while you are
  // trying to scroll a currency list is worse than one that does not move.
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    dragging.current = true;
    startY.current = e.touches[0].clientY;
    startTime.current = performance.now();
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging.current) return;
    const dy = e.touches[0].clientY - startY.current;
    // Downward only; pulling up would lift the sheet off its own edge.
    setDrag(Math.max(0, dy));
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    const height = sheetRef.current?.offsetHeight ?? 1;
    const elapsed = Math.max(performance.now() - startTime.current, 1);
    const velocity = drag / elapsed;
    if (drag > height * DISMISS_RATIO || velocity > DISMISS_VELOCITY) {
      hapticTap();
      onClose();
    } else {
      setDrag(0);
    }
  }, [drag, onClose]);

  // Only the front sheet answers Escape, or one press closes the whole stack.
  useEffect(() => {
    if (!open || !isTop) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, isTop, onClose]);

  if (!mounted) return null;

  const grabber = (
    <div className="flex justify-center pt-3 pb-2 shrink-0">
      <div className="w-10 h-1 rounded-full bg-ink/20" />
    </div>
  );

  return createPortal(
    <>
      {/* Backdrop — fades with the drag so the sheet feels attached to it.
          Only the front sheet draws one: two stacked drawers each rendering a
          60% scrim compounds to ~84% and reads as a different, much darker
          screen the moment a nested picker opens. */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-scrim/60 z-scrim transition-opacity duration-slow ease-out ${
          open && isTop ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={open && isTop && drag > 0 ? { opacity: Math.max(1 - drag / 320, 0) } : undefined}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={isBehind}
        className={`fixed z-drawer backdrop-blur-2xl border-ink/10 flex flex-col origin-bottom ${
          dragging.current ? "" : "transition-transform duration-slow ease-out"
        } ${isBehind ? "pointer-events-none" : ""} ${
          fullScreen
            ? "inset-0 border-0 sm:inset-auto sm:bottom-0 sm:left-0 sm:right-0 sm:max-w-2xl sm:mx-auto sm:border-t sm:border-x sm:rounded-t-2xl"
            : "bottom-0 left-0 right-0 max-w-2xl mx-auto border-t border-x rounded-t-2xl"
        }`}
        style={{
          backgroundColor: "rgb(var(--sheet) / 0.9)",
          // Scaled from the bottom edge, which is pinned to the viewport — a
          // centre-origin scale would lift the sheet and show the page under it.
          transform: open
            ? `translateY(${drag}px)${isBehind ? " scale(0.96)" : ""}`
            : "translateY(100%)",
        }}
      >
        {/* The front sheet's scrim can't reach this one (both are z-drawer), so
            a receded sheet dims itself. */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 rounded-t-2xl bg-scrim/30 transition-opacity duration-slow ease-out ${
            isBehind ? "opacity-100" : "opacity-0"
          }`}
          style={{ pointerEvents: "none", zIndex: 1 }}
        />
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={() => { dragging.current = false; setDrag(0); }}
          className={`shrink-0 touch-none transition-opacity duration-slow ease-out ${
            isBehind ? "opacity-0" : "opacity-100"
          }`}
        >
          {/* A sheet behind another shows only its rounded top edge peeking out.
              Two grabbers and two titles stacked read as two competing sheets
              rather than one stack with a front and a back. Faded rather than
              unmounted: the sheet is bottom-anchored, so removing its header
              would shift the top edge and make the recede animation jump. */}
          {!fullScreen && grabber}
          {fullScreen && <div className="hidden sm:block">{grabber}</div>}

          {title && (
            <div
              className={`px-4 pb-3 border-b border-ink/10 flex items-center justify-between shrink-0 ${fullScreen ? "sm:!pt-1" : ""}`}
              style={fullScreen ? { paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' } : { paddingTop: '0.25rem' }}
            >
              <p className="font-sans font-semibold text-ink text-base">{title}</p>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-ink/7 border border-ink/10 text-ink/40 hover:text-ink/90 hover:border-ink/30 transition-[color,border-color,transform] duration-fast active:scale-90"
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>

        <div
          className={`overflow-y-auto p-2 ${fullScreen ? "flex-1 sm:flex-none sm:max-h-[60vh]" : "max-h-[60vh]"} ${contentClassName ?? ""}`}
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
        >
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}
