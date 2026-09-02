"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { TrendingUp, TrendingDown, PieChart, Calendar, RefreshCw } from "lucide-react";
import type { Expense, Subscription } from "@/types";
import { getExpensesByMonth } from "@/lib/supabase";
import { formatAmount } from "@/lib/currencies";
import { getCategoryColor, OTHER_CATEGORY_COLOR } from "@/lib/categories";
import Surface from "@/components/Surface";
import Meter from "@/components/ui/Meter";
import SegmentedControl, { type Segment } from "@/components/ui/SegmentedControl";
import ViewTransition from "@/components/ui/ViewTransition";
import { usePrivacy } from "@/components/PrivacyContext";
import { useTheme } from "@/components/ThemeContext";

interface Props {
  expenses: Expense[];
  subscriptions: Subscription[];
  selectedMonth: { year: number; month: number };
  currency: string;
  monthlyIncome: number | null;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function daysElapsed(year: number, month: number) {
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  return isCurrentMonth ? Math.max(now.getDate(), 1) : daysInMonth(year, month);
}

function prevMonthOf(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

// ─── Category Chart ───────────────────────────────────────────────────────────

interface CategoryStat {
  category: string;
  amount: number;
  pct: number;
  color: string;
}

function buildCategoryStats(
  expenses: Expense[],
  subscriptions: Subscription[],
  theme: "light" | "dark" = "dark",
): CategoryStat[] {
  const map: Record<string, number> = {};
  for (const e of expenses) {
    map[e.category] = (map[e.category] ?? 0) + Number(e.amount);
  }
  for (const s of subscriptions) {
    map[s.category] = (map[s.category] ?? 0) + Number(s.amount);
  }
  const total = Object.values(map).reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .map(([category, amount]) => ({
      category,
      amount,
      pct: (amount / total) * 100,
      color: getCategoryColor(category, theme) ?? OTHER_CATEGORY_COLOR[theme],
    }));
}

const CategoryChart = memo(function CategoryChart({
  expenses,
  subscriptions,
  currency,
}: {
  expenses: Expense[];
  subscriptions: Subscription[];
  currency: string;
}) {
  const { mask } = usePrivacy();
  const { theme } = useTheme();
  const stats = useMemo(() => buildCategoryStats(expenses, subscriptions, theme), [expenses, subscriptions, theme]);

  if (stats.length === 0) {
    return (
      <Surface borderRadius={28}>
        <div className="px-6 py-10 text-center w-full">
          <p className="text-muted text-body font-mono">No spending data yet</p>
        </div>
      </Surface>
    );
  }

  return (
    <Surface borderRadius={28}>
      <div className="px-5 py-5 flex flex-col gap-4 w-full">
        <span className="font-sans text-xs text-muted font-semibold">
          Spending by Category
        </span>
        <div className="flex flex-col gap-4">
          {stats.map(({ category, amount, pct, color }, i) => (
            <div
              key={category}
              className="flex flex-col gap-2 animate-row-in"
              style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-sans text-body text-ink/80">{category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-muted">{pct.toFixed(0)}%</span>
                  <span className="font-mono text-body text-ink font-medium">{mask(formatAmount(amount, currency))}</span>
                </div>
              </div>
              <Meter value={pct} className="h-2 w-full bg-ink/6" barStyle={{ backgroundColor: color }} />
            </div>
          ))}
        </div>
      </div>
    </Surface>
  );
});

// ─── Insight Cards ────────────────────────────────────────────────────────────

interface Insight {
  id: string;
  text: string;
  sub?: string;
  type: "neutral" | "positive" | "warning";
  icon?: React.ReactNode;
}

function buildInsights(
  expenses: Expense[],
  subscriptions: Subscription[],
  prevExpenses: Expense[],
  selectedMonth: { year: number; month: number },
  currency: string,
  monthlyIncome: number | null,
  budget: number | null,
  mask: (v: string) => string,
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();
  const isCurrentMonth =
    now.getFullYear() === selectedMonth.year && now.getMonth() + 1 === selectedMonth.month;

  const stats = buildCategoryStats(expenses, subscriptions);
  const expTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const subTotal = subscriptions.reduce((s, s2) => s + Number(s2.amount), 0);
  const total = expTotal + subTotal;

  if (stats.length > 0) {
    const top = stats[0];
    insights.push({
      id: "top-cat",
      text: `${top.category} is your biggest spend`,
      sub: `${top.pct.toFixed(0)}% of total — ${mask(formatAmount(top.amount, currency))} ${currency}`,
      type: "neutral",
      icon: <PieChart size={26} className="text-ink/40" />,
    });
  }

  if (isCurrentMonth && expenses.length > 0) {
    const elapsed = daysElapsed(selectedMonth.year, selectedMonth.month);
    const totalDays = daysInMonth(selectedMonth.year, selectedMonth.month);
    const avgDay = expTotal / elapsed;
    const projected = avgDay * totalDays + subTotal;
    insights.push({
      id: "projection",
      text: `On track to spend ${mask(formatAmount(projected, currency))} ${currency} this month`,
      sub: `Avg ${mask(formatAmount(avgDay, currency))} ${currency}/day over ${elapsed} days`,
      type: projected > (budget ?? Infinity) ? "warning" : "neutral",
      icon: projected > (budget ?? Infinity)
        ? <TrendingUp size={26} className="text-danger" />
        : <Calendar size={26} className="text-ink/40" />,
    });
  }

  if (monthlyIncome && monthlyIncome > 0) {
    const saved = monthlyIncome - total;
    const rate = (saved / monthlyIncome) * 100;
    if (saved >= 0) {
      insights.push({
        id: "savings",
        text: `You've saved ${mask(formatAmount(saved, currency))} ${currency} this month`,
        sub: `${rate.toFixed(0)}% savings rate`,
        type: "positive",
        icon: <TrendingUp size={26} className="text-accent" />,
      });
    } else {
      insights.push({
        id: "overspend-income",
        text: `You're ${mask(formatAmount(Math.abs(saved), currency))} ${currency} over your income`,
        sub: `Spending exceeds income by ${Math.abs(rate).toFixed(0)}%`,
        type: "warning",
        icon: <TrendingDown size={26} className="text-danger" />,
      });
    }
  }

  if (prevExpenses.length > 0 && stats.length > 0) {
    const prevMap: Record<string, number> = {};
    for (const e of prevExpenses) prevMap[e.category] = (prevMap[e.category] ?? 0) + Number(e.amount);
    const topCat = stats[0].category;
    const prev = prevMap[topCat] ?? 0;
    const curr = stats[0].amount;
    if (prev > 0) {
      const pctChange = ((curr - prev) / prev) * 100;
      const dir = pctChange > 0 ? "up" : "down";
      insights.push({
        id: "mom",
        text: `${topCat} is ${dir} ${Math.abs(pctChange).toFixed(0)}% from last month`,
        sub: `${mask(formatAmount(prev, currency))} → ${mask(formatAmount(curr, currency))} ${currency}`,
        type: pctChange > 15 ? "warning" : pctChange < -10 ? "positive" : "neutral",
        icon: pctChange > 0
          ? <TrendingUp size={26} className="text-danger" />
          : <TrendingDown size={26} className="text-accent" />,
      });
    }
  }

  if (subscriptions.length > 0) {
    insights.push({
      id: "subs",
      text: `${subscriptions.length} active subscription${subscriptions.length > 1 ? "s" : ""}`,
      sub: `${mask(formatAmount(subTotal, currency))} ${currency}/month fixed cost`,
      type: "neutral",
      icon: <RefreshCw size={26} className="text-muted" />,
    });
  }

  return insights;
}

const InsightCards = memo(function InsightCards({
  expenses,
  subscriptions,
  prevExpenses,
  selectedMonth,
  currency,
  monthlyIncome,
  budget,
}: {
  expenses: Expense[];
  subscriptions: Subscription[];
  prevExpenses: Expense[];
  selectedMonth: { year: number; month: number };
  currency: string;
  monthlyIncome: number | null;
  budget: number | null;
}) {
  const { mask } = usePrivacy();
  const insights = useMemo(
    () => buildInsights(expenses, subscriptions, prevExpenses, selectedMonth, currency, monthlyIncome, budget, mask),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses, subscriptions, prevExpenses, selectedMonth, currency, monthlyIncome, budget, mask],
  );

  if (insights.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {insights.map((insight, i) => (
        <Surface
          key={insight.id}
          borderRadius={24}
          className="animate-row-in"
          style={{
            animationDelay: `${Math.min(i * 60, 300)}ms`,
            ...(insight.type === "positive"
              ? { borderColor: "rgb(var(--accent-text) / 0.2)" }
              : insight.type === "warning"
              ? { borderColor: "rgb(var(--danger) / 0.2)" }
              : {}),
          }}
        >
          <div className="px-5 py-5 flex items-start gap-4 w-full">
            {insight.icon && (
              <span className="flex-shrink-0">{insight.icon}</span>
            )}
            <div className="flex flex-col gap-1 min-w-0">
              <p className="font-sans text-sm font-semibold text-ink leading-snug">{insight.text}</p>
              {insight.sub && (
                <p className="font-mono text-sm text-muted leading-relaxed">{insight.sub}</p>
              )}
            </div>
          </div>
        </Surface>
      ))}
    </div>
  );
});

// ─── Month-over-Month ─────────────────────────────────────────────────────────

const MomComparison = memo(function MomComparison({
  expenses,
  prevExpenses,
  subscriptions,
  currency,
  selectedMonth,
}: {
  expenses: Expense[];
  prevExpenses: Expense[];
  subscriptions: Subscription[];
  currency: string;
  selectedMonth: { year: number; month: number };
}) {
  const { mask } = usePrivacy();
  const { theme } = useTheme();
  const { year, month } = prevMonthOf(selectedMonth.year, selectedMonth.month);
  const prevLabel = new Date(year, month - 1, 1).toLocaleDateString("en", { month: "short", year: "2-digit" });

  const currMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of expenses) m[e.category] = (m[e.category] ?? 0) + Number(e.amount);
    for (const s of subscriptions) m[s.category] = (m[s.category] ?? 0) + Number(s.amount);
    return m;
  }, [expenses, subscriptions]);

  const prevMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of prevExpenses) m[e.category] = (m[e.category] ?? 0) + Number(e.amount);
    return m;
  }, [prevExpenses]);

  const categories = useMemo(() => {
    const allKeys = Object.keys(currMap).concat(Object.keys(prevMap));
    const seen = new Set<string>();
    const all = allKeys.filter((k) => { if (seen.has(k)) return false; seen.add(k); return true; });
    return all
      .map((cat) => ({
        cat,
        curr: currMap[cat] ?? 0,
        prev: prevMap[cat] ?? 0,
        color: getCategoryColor(cat, theme) ?? OTHER_CATEGORY_COLOR[theme],
      }))
      .filter((r) => r.curr > 0 || r.prev > 0)
      .sort((a, b) => b.curr - a.curr)
      .slice(0, 6);
  }, [currMap, prevMap, theme]);

  if (categories.length === 0) return null;

  return (
    <Surface borderRadius={28}>
      <div className="px-5 py-5 flex flex-col gap-4 w-full">
        <div className="flex items-center justify-between">
          <span className="font-sans text-xs text-muted font-semibold">
            vs Last Month
          </span>
          <span className="font-mono text-sm text-muted">{prevLabel}</span>
        </div>
        <div className="flex flex-col gap-3">
          {categories.map(({ cat, curr, prev, color }, i) => {
            const pctChange = prev > 0 ? ((curr - prev) / prev) * 100 : null;
            const isUp = curr > prev;
            return (
              <div
                key={cat}
                className="flex items-center gap-3 animate-row-in"
                style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="font-sans text-body text-ink/80 flex-1 truncate">{cat}</span>
                <span className="font-mono text-body text-ink flex-shrink-0">{mask(formatAmount(curr, currency))}</span>
                {pctChange !== null ? (
                  <span className={`font-mono text-sm font-semibold flex-shrink-0 w-16 text-right ${isUp ? "text-danger" : "text-accent"}`}>
                    {isUp ? "+" : ""}{pctChange.toFixed(0)}%
                  </span>
                ) : (
                  <span className="font-mono text-sm text-muted flex-shrink-0 w-16 text-right">new</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Surface>
  );
});

// ─── Main AnalyticsView ───────────────────────────────────────────────────────

type Tab = "insights" | "spending" | "vs-last";

const TABS: Segment<Tab>[] = [
  { key: "insights",  label: "Overview" },
  { key: "spending",  label: "By Category" },
  { key: "vs-last",   label: "vs Last Month" },
];

const TAB_ORDER: Tab[] = TABS.map((t) => t.key);

export default function AnalyticsView({
  expenses,
  subscriptions,
  selectedMonth,
  currency,
  monthlyIncome,
}: Props) {
  const [prevExpenses, setPrevExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("insights");
  const [tabDir, setTabDir] = useState(1);

  const changeTab = useCallback(
    (next: Tab) => {
      setTabDir(TAB_ORDER.indexOf(next) >= TAB_ORDER.indexOf(tab) ? 1 : -1);
      setTab(next);
    },
    [tab],
  );

  useEffect(() => {
    const { year, month } = prevMonthOf(selectedMonth.year, selectedMonth.month);
    getExpensesByMonth(year, month)
      .then(setPrevExpenses)
      .catch(() => {});
  }, [selectedMonth]);

  useEffect(() => {
    const b = localStorage.getItem("minti_budget");
    if (b) setBudget(parseFloat(b));
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {/* Tab bar */}
      <SegmentedControl<Tab>
        items={TABS}
        value={tab}
        onChange={changeTab}
        ariaLabel="Insight views"
        className="flex gap-2"
        itemClassName="flex-1 h-10 rounded-full text-sm font-semibold border transition-colors"
        pillClassName="flat-chip-active border-2 rounded-full"
        activeClassName="text-chip-on border-transparent"
        inactiveClassName="flat-chip text-ink/60 hover:text-ink"
      />

      <ViewTransition trigger={tab} direction={tabDir}>
        {tab === "insights" && (
          <InsightCards
            expenses={expenses}
            subscriptions={subscriptions}
            prevExpenses={prevExpenses}
            selectedMonth={selectedMonth}
            currency={currency}
            monthlyIncome={monthlyIncome}
            budget={budget}
          />
        )}

        {tab === "spending" && (
          <CategoryChart expenses={expenses} subscriptions={subscriptions} currency={currency} />
        )}

        {tab === "vs-last" && (
          <MomComparison
            expenses={expenses}
            prevExpenses={prevExpenses}
            subscriptions={subscriptions}
            currency={currency}
            selectedMonth={selectedMonth}
          />
        )}
      </ViewTransition>
    </div>
  );
}
