"use client";

import { ChevronRight } from "lucide-react";
import Surface from "@/components/Surface";

// A section is one card, the way every list on the main page is one card: the
// rows divided inside it rather than floating on the ground. The heading stays
// outside so the page keeps its structure — a card names what it holds, it does
// not replace the name.
//
// PushPage already gutters by px-2; the extra px-2 here puts the card edge
// 16px in, where the main page's cards sit. The heading takes no padding of its
// own so it starts on that same edge — indented off the card it names, it reads
// as floating rather than as belonging to it.
export function ListSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-2 pt-7 first:pt-3">
      <h2 className="pb-2 font-sans text-xl font-bold text-ink">{title}</h2>
      <Surface borderRadius={28}>
        <div className="w-full divide-y divide-ink/10">{children}</div>
      </Surface>
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
//
// The row is full-bleed with a square pressed fill: it sits inside a Surface,
// whose radius already clips the first and last row, and a rounded fill inside
// a rounded card reads as a second, smaller card.
export function ListRow({ icon, label, description, trailing, onClick, danger, ...rest }: RowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-ink/7 transition-[background-color,transform] duration-fast active:scale-[0.98]"
      {...rest}
    >
      {/* A fixed column rather than the icon's own width: the glyphs differ in
          bearing, and every label on the page has to start on the same line.
          It is what is left of the 48px circle each icon used to sit in. */}
      <span
        className={`w-6 shrink-0 flex items-center justify-center ${
          danger ? "text-danger" : "text-ink"
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
