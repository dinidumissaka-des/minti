"use client";

import { useRef } from "react";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import MonthChip from "@/components/MonthChip";
import { formatAmount } from "@/lib/currencies";
import { hapticTap } from "@/lib/haptics";

interface Props {
  label: string;
  value: number;
  currency: string;
  onCurrencyClick: () => void;
  /** Omitted for figures that aren't scoped to a month, like recurring bills. */
  month?: { year: number; month: number };
  onMonthClick?: () => void;
  onMonthStep?: (dir: 1 | -1) => void;
}

const SWIPE_MIN = 56;

// The two things that give the figure its meaning — which month, which
// currency — sit on the figure itself. They used to live behind the header's
// overflow menu, which left the largest number on the screen with nothing
// saying what it counted.
export default function HeroAmount({
  label,
  value,
  currency,
  onCurrencyClick,
  month,
  onMonthClick,
  onMonthStep,
}: Props) {
  const start = useRef<{ x: number; y: number } | null>(null);

  // Scoped to the hero rather than the page: expense rows own the horizontal
  // gesture for their swipe actions, and the two would fight over the list.
  function onTouchStart(e: React.TouchEvent) {
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const from = start.current;
    start.current = null;
    if (!from || !onMonthStep) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    hapticTap();
    onMonthStep(dx < 0 ? 1 : -1);
  }

  return (
    <div
      className="px-1 pt-2 pb-5 flex flex-col items-center gap-1 text-center"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* The chip is the label on mobile — "Sep 2026" says everything "This
          Month" did and more. Desktop has no chip (the header carries the month
          nav), so it keeps the words. */}
      <div className="flex items-center justify-center min-h-[2rem] sm:min-h-0">
        {month && onMonthClick && (
          <MonthChip year={month.year} month={month.month} onClick={onMonthClick} />
        )}
        <span
          className={`font-sans text-xs text-muted font-semibold leading-none ${
            month && onMonthClick ? "hidden sm:inline" : ""
          }`}
        >
          {label}
        </span>
      </div>
      {/* Wraps rather than overflows: at hero size a six-figure amount plus a
          currency code is wider than a phone. */}
      <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-0">
        <AnimatedNumber
          value={value}
          format={(v) => formatAmount(v, currency)}
          className="font-mono text-5xl font-bold text-ink leading-tight"
        />
        <button
          onClick={onCurrencyClick}
          aria-label={`Currency — currently ${currency}`}
          className="font-mono text-5xl font-bold leading-tight text-ink/40 hover:text-ink/70 py-2 -my-2 rounded-full transition-[color,transform] duration-fast active:scale-95"
        >
          {currency}
        </button>
      </div>
    </div>
  );
}
