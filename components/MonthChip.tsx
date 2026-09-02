"use client";

import { ChevronDown } from "lucide-react";
import { monthLabel } from "@/lib/months";

interface Props {
  year: number;
  month: number;
  onClick: () => void;
  className?: string;
}

// Mobile only, by design: the desktop header carries its own ‹ Sep 2026 ›
// month nav, and two of them on one screen is the duplication this chip was
// added to remove.
export default function MonthChip({ year, month, onClick, className = "" }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label={`Change month — currently ${monthLabel(year, month)}`}
      className={`sm:hidden flex items-center gap-1 h-8 px-3 rounded-full border flat-chip text-ink/60 hover:text-ink text-xs font-mono transition-[color,background-color,border-color,transform] duration-fast active:scale-95 ${className}`}
    >
      {monthLabel(year, month)}
      <ChevronDown size={11} />
    </button>
  );
}
