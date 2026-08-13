"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { hapticTap } from "@/lib/haptics";

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

  const sheetRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  const grabber = (
    <div className="flex justify-center pt-3 pb-2 shrink-0">
      <div className="w-10 h-1 rounded-full bg-ink/20" />
    </div>
  );

  return createPortal(
    <>
      {/* Backdrop — fades with the drag so the sheet feels attached to it. */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-scrim/60 z-scrim transition-opacity duration-slow ease-out ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={open && drag > 0 ? { opacity: Math.max(1 - drag / 320, 0) } : undefined}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed z-drawer backdrop-blur-2xl border-ink/10 flex flex-col ${
          dragging.current ? "" : "transition-transform duration-slow ease-out"
        } ${
          fullScreen
            ? "inset-0 border-0 sm:inset-auto sm:bottom-0 sm:left-0 sm:right-0 sm:max-w-2xl sm:mx-auto sm:border-t sm:border-x sm:rounded-t-2xl"
            : "bottom-0 left-0 right-0 max-w-2xl mx-auto border-t border-x rounded-t-2xl"
        }`}
        style={{
          backgroundColor: "rgb(var(--sheet) / 0.9)",
          transform: open ? `translateY(${drag}px)` : "translateY(100%)",
        }}
      >
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={() => { dragging.current = false; setDrag(0); }}
          className="shrink-0 touch-none"
        >
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
