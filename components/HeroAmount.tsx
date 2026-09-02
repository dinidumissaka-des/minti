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
      className="px-1 pt-2 pb-5 flex flex-col gap-1"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between gap-2 min-h-[2rem] sm:min-h-0">
        <span className="font-sans text-xs text-muted font-semibold leading-none">{label}</span>
        {month && onMonthClick && (
          <MonthChip year={month.year} month={month.month} onClick={onMonthClick} />
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <button
          onClick={onCurrencyClick}
          aria-label={`Change currency — currently ${currency}`}
          className="font-mono text-base font-semibold text-ink/40 hover:text-ink/80 px-1.5 -ml-1.5 py-2 -my-2 rounded-full transition-[color,transform] duration-fast active:scale-95"
        >
          {currency}
        </button>
        <AnimatedNumber
          value={value}
          format={(v) => formatAmount(v, currency)}
          className="font-mono text-5xl font-bold text-ink leading-tight"
        />
      </div>
    </div>
  );
}
