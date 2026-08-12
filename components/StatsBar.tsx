"use client";

import { memo } from "react";
import type { Expense } from "@/types";
import { formatAmount } from "@/lib/currencies";
import GlassSurface from "@/components/GlassSurface";
import { usePrivacy } from "@/components/PrivacyContext";

interface Props {
  expenses: Expense[];
  selectedMonth: { year: number; month: number };
  currency: string;
  subscriptionsTotal?: number;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function daysElapsedInMonth(year: number, month: number, isCurrentMonth: boolean): number {
  if (isCurrentMonth) return Math.max(new Date().getDate(), 1);
  return new Date(year, month, 0).getDate();
}

const StatsBar = memo(function StatsBar({ expenses, selectedMonth, currency, subscriptionsTotal = 0 }: Props) {
  const { mask } = usePrivacy();
  const today = todayISO();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const isCurrentMonth =
    selectedMonth.month === currentMonth && selectedMonth.year === currentYear;

  const monthTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0) + subscriptionsTotal;
  const todayTotal = expenses
    .filter((e) => e.date === today)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const days = daysElapsedInMonth(selectedMonth.year, selectedMonth.month, isCurrentMonth);
  const avgPerDay = expenses.length > 0 ? monthTotal / days : 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Hero — no container */}
      <div className="px-1 pt-2 pb-5 flex flex-col gap-1">
        <span className="font-sans text-xs text-muted font-semibold leading-none">
          {isCurrentMonth ? "This Month" : "Month Total"}
        </span>
        <span className="font-mono text-5xl font-bold text-ink leading-tight">
          {mask(formatAmount(monthTotal, currency))}
        </span>
      </div>

      {/* Today + Avg/Day — one container */}
      <GlassSurface borderRadius={28}>
        <div className="w-full grid grid-cols-2 divide-x divide-ink/7">
          <div className="px-5 py-4 flex flex-col gap-1">
            <span className="font-sans text-xs text-muted font-semibold leading-none">
              Today
            </span>
            <span className="font-mono text-2xl font-bold text-ink leading-tight">
              {mask(formatAmount(todayTotal, currency))}
            </span>
          </div>
          <div className="px-5 py-4 flex flex-col gap-1">
            <span className="font-sans text-xs text-muted font-semibold leading-none">
              Avg/Day
            </span>
            <span className="font-mono text-2xl font-bold text-ink leading-tight">
              {mask(formatAmount(avgPerDay, currency))}
            </span>
          </div>
        </div>
      </GlassSurface>
    </div>
  );
});

export default StatsBar;
