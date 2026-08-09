"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { Expense, Subscription } from "@/types";
import { getExpensesByMonth, getSubscriptions, getUserSettings, onAuthStateChange } from "@/lib/supabase";
import { DEFAULT_CURRENCY } from "@/lib/currencies";
import AnalyticsView from "@/components/analytics/AnalyticsView";
import Logo from "@/components/Logo";
import { Ripple } from "@/components/ui/ripple";
import GradualBlur from "@/components/GradualBlur";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function InsightsPage() {
  const now = new Date();
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [monthlyIncome, setMonthlyIncome] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  useEffect(() => {
    const c = localStorage.getItem("minti_currency");
    if (c) setCurrency(c);
    const mi = localStorage.getItem("minti_monthly_income");
    if (mi) setMonthlyIncome(parseFloat(mi));
  }, []);

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((u) => {
      setUser(u);
      if (u === null) router.replace("/");
    });
    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    getUserSettings().then((s) => {
      if (s) {
        setCurrency(s.currency);
        setMonthlyIncome(s.monthly_income ?? null);
      }
    }).catch(() => {});
    getSubscriptions().then(setSubscriptions).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getExpensesByMonth(selectedMonth.year, selectedMonth.month)
      .then(setExpenses)
      .catch(() => {});
  }, [user, selectedMonth]);

  function prevMonth() {
    setSelectedMonth(({ year, month }) =>
      month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 },
    );
  }

  function nextMonth() {
    setSelectedMonth(({ year, month }) =>
      month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 },
    );
  }

  if (user === undefined) {
    return (
      <main className="relative z-10 min-h-screen flex items-center justify-center">
        <Ripple className="w-11 h-11 text-accent" />
      </main>
    );
  }

  return (
    <main id="main-content" className="relative z-10 min-h-screen text-text">
      <GradualBlur target="page" position="bottom" height="5rem" strength={1.5} divCount={6} curve="bezier" zIndex={10} className="hidden sm:block" />
      <div
        className="max-w-2xl mx-auto px-4 pb-16 flex flex-col gap-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        {/* Main nav */}
        <div className="flex items-center justify-between pt-1 pb-2">
          <Logo className="h-5 w-auto" />
        </div>

        {/* Sub-nav: back + month */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="flex items-center gap-1.5 h-10 px-3 rounded-full border flat-chip text-ink/50 hover:text-ink transition-colors text-xs font-mono"
          >
            <ArrowLeft size={13} />
            Back
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={prevMonth}
              aria-label="Previous month"
              className="w-10 h-10 flex items-center justify-center rounded-full border flat-chip text-ink/40 hover:text-ink/90 transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="font-mono text-xs text-ink/70 min-w-[52px] text-center">
              {MONTH_NAMES[selectedMonth.month - 1]} {selectedMonth.year}
            </span>
            <button
              onClick={nextMonth}
              aria-label="Next month"
              className="w-10 h-10 flex items-center justify-center rounded-full border flat-chip text-ink/40 hover:text-ink/90 transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>


        <AnalyticsView
          expenses={expenses}
          subscriptions={subscriptions}
          selectedMonth={selectedMonth}
          currency={currency}
          monthlyIncome={monthlyIncome}
        />
      </div>
    </main>
  );
}
