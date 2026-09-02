"use client";

import { ChevronRight } from "lucide-react";

export function ListSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pt-7 first:pt-2">
      <h2 className="px-4 pb-2 font-sans text-xl font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

interface RowProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  description?: string;
  /** Replaces the chevron. Pass an empty element for a row that ends nowhere. */
  trailing?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

// The label is the row's subject and the value its answer, so the label reads
// at full strength and the value dims — the overflow menu this replaced had it
// the other way round, which made every label look disabled.
export function ListRow({ icon, label, description, trailing, onClick, danger, ...rest }: RowProps) {
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

// A value on a row that drills in. The chevron stays: without it the row reads
// as a setting that changes in place, which is what Appearance does.
export function RowValue({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-sm text-ink/50">
      {children}
      <ChevronRight size={14} className="text-ink/40" />
    </span>
  );
}

export function RowToggle({ on }: { on: boolean }) {
  return (
    <span className={`font-mono text-xs font-semibold ${on ? "text-accent" : "text-ink/40"}`}>
      {on ? "ON" : "OFF"}
    </span>
  );
}
