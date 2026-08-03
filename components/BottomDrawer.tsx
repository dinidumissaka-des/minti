"use client";

import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  contentClassName?: string;
  fullScreen?: boolean;
}

export default function BottomDrawer({ open, onClose, title, children, contentClassName, fullScreen }: Props) {

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 z-[60] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed z-[70] backdrop-blur-2xl border-ink/10 transition-transform duration-300 ease-out flex flex-col ${
          fullScreen
            ? `inset-0 border-0 sm:inset-auto sm:bottom-0 sm:left-0 sm:right-0 sm:max-w-2xl sm:mx-auto sm:border-t sm:border-x sm:rounded-t-2xl ${open ? "translate-y-0" : "translate-y-full"}`
            : `bottom-0 left-0 right-0 max-w-2xl mx-auto border-t border-x rounded-t-2xl ${open ? "translate-y-0" : "translate-y-full"}`
        }`}
        style={{ backgroundColor: "rgb(var(--background) / 0.85)" }}
      >
        {!fullScreen && (
          <div className="flex justify-center pt-3 pb-2 shrink-0">
            <div className="w-10 h-1 rounded-full bg-ink/20" />
          </div>
        )}
        {fullScreen && (
          <div className="hidden sm:flex justify-center pt-3 pb-2 shrink-0">
            <div className="w-10 h-1 rounded-full bg-ink/20" />
          </div>
        )}

        {title && (
          <div
            className={`px-4 pb-3 border-b border-ink/10 flex items-center justify-between shrink-0 ${fullScreen ? "sm:!pt-1" : ""}`}
            style={fullScreen ? { paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' } : { paddingTop: '0.25rem' }}
          >
            <p className="font-sans font-semibold text-ink text-base">{title}</p>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-ink/[0.07] border border-ink/[0.1] text-ink/40 hover:text-ink/90 hover:border-ink/[0.3] transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        )}

        <div
          className={`overflow-y-auto p-2 ${fullScreen ? "flex-1 sm:flex-none sm:max-h-[60vh]" : "max-h-[60vh]"} ${contentClassName ?? ""}`}
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
