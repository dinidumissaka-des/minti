"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
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
  budget: number | null;
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

// ─── Overview ─────────────────────────────────────────────────────────────────
//
// This was five identical cards — icon, sentence, sentence — which is a list of
// prose where every figure is a number the reader has to picture for themselves.
// Each one is now shown as the shape of its own question: a pace against a
// limit, two headline figures, a part-to-whole, and a before/after.

function StatTile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "positive" | "warning" }) {
  return (
    <div className="px-5 py-4 flex flex-col gap-1 min-w-0">
      <span className="font-sans text-xs text-muted font-semibold leading-none">{label}</span>
      <span
        className={`font-mono text-2xl font-bold leading-tight truncate ${
          tone === "warning" ? "text-danger" : "text-ink"
        }`}
      >
        {value}
      </span>
      <span className="font-mono text-xs text-muted truncate">{sub}</span>
    </div>
  );
}

const Overview = memo(function Overview({
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
  const { theme } = useTheme();

  const stats = useMemo(
    () => buildCategoryStats(expenses, subscriptions, theme),
    [expenses, subscriptions, theme],
  );

  const money = (v: number) => `${mask(formatAmount(v, currency))} ${currency}`;

  const now = new Date();
  const isCurrentMonth =
    now.getFullYear() === selectedMonth.year && now.getMonth() + 1 === selectedMonth.month;
  const elapsed = daysElapsed(selectedMonth.year, selectedMonth.month);
  const totalDays = daysInMonth(selectedMonth.year, selectedMonth.month);

  const expTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const subTotal = subscriptions.reduce((sum, s) => sum + Number(s.amount), 0);
  const total = expTotal + subTotal;
  const avgDay = expTotal / Math.max(elapsed, 1);
  const projected = isCurrentMonth ? avgDay * totalDays + subTotal : total;

  // Budget is the limit the bar is drawn against; income stands in when there
  // is no budget, because a bar needs something to be a fraction of.
  const limit = budget ?? monthlyIncome ?? null;
  const spentPct = limit ? Math.min((total / limit) * 100, 100) : 0;
  const projectedPct = limit ? Math.min((projected / limit) * 100, 100) : 0;
  const over = limit != null && projected > limit;

  const prevTop = useMemo(() => {
    if (stats.length === 0 || prevExpenses.length === 0) return null;
    const top = stats[0];
    const prev = prevExpenses
      .filter((e) => e.category === top.category)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    if (prev <= 0) return null;
    return { ...top, prev };
  }, [stats, prevExpenses]);

  const prevLabel = useMemo(() => {
    const { year, month } = prevMonthOf(selectedMonth.year, selectedMonth.month);
    return new Date(year, month - 1, 1).toLocaleDateString("en", { month: "short" });
  }, [selectedMonth]);

  const shares = useMemo(() => {
    const head = stats.slice(0, 4);
    const restPct = stats.slice(4).reduce((sum, s) => sum + s.pct, 0);
    const restAmount = stats.slice(4).reduce((sum, s) => sum + s.amount, 0);
    return restPct > 0
      ? [...head, { category: "Other", amount: restAmount, pct: restPct, color: OTHER_CATEGORY_COLOR[theme] }]
      : head;
  }, [stats, theme]);

  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Pace: what is spent, where it is heading, against what it is allowed */}
      <Surface borderRadius={28} className="animate-row-in">
        <div className="px-5 py-5 flex flex-col gap-3 w-full">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-sans text-xs text-muted font-semibold">
              {isCurrentMonth ? "On track for" : "Spent"}
            </span>
            <span className="font-mono text-xs text-muted">
              {isCurrentMonth ? `day ${elapsed} of ${totalDays}` : `${totalDays} days`}
            </span>
          </div>
          <span className={`font-mono text-4xl font-bold leading-none ${over ? "text-danger" : "text-ink"}`}>
            {money(projected)}
          </span>

          {limit != null && (
            <div className="relative pt-1">
              <Meter
                value={spentPct}
                className="h-2 bg-ink/10"
                barClassName={over ? "bg-danger-fill" : "bg-accent-fill"}
              />
              {/* Where the month lands if the rest of it looks like the part
                  already spent. Nothing to mark once the month is over. */}
              {isCurrentMonth && projectedPct > spentPct && (
                <span
                  aria-hidden="true"
                  className="absolute top-1 h-2 w-0.5 rounded-full bg-ink/60"
                  style={{ left: `${projectedPct}%` }}
                />
              )}
            </div>
          )}

          <p className="font-mono text-xs text-muted">
            {limit != null
              ? `${money(total)} of ${money(limit)}${budget == null ? " income" : " budget"}`
              : `${money(avgDay)}/day over ${elapsed} day${elapsed === 1 ? "" : "s"}`}
          </p>
        </div>
      </Surface>

      {(monthlyIncome != null || subscriptions.length > 0) && (
        <Surface borderRadius={28} className="animate-row-in" style={{ animationDelay: "60ms" }}>
          <div
            className={`w-full grid divide-x divide-ink/7 ${
              monthlyIncome != null && subscriptions.length > 0 ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            {monthlyIncome != null && monthlyIncome > 0 && (
              <StatTile
                label={total > monthlyIncome ? "Over income" : "Saved"}
                value={mask(formatAmount(Math.abs(monthlyIncome - total), currency))}
                sub={`${Math.abs(((monthlyIncome - total) / monthlyIncome) * 100).toFixed(0)}% of income`}
                tone={total > monthlyIncome ? "warning" : undefined}
              />
            )}
            {subscriptions.length > 0 && (
              <StatTile
                label={`Bill${subscriptions.length === 1 ? "" : "s"}`}
                value={String(subscriptions.length)}
                sub={`${mask(formatAmount(subTotal, currency))} fixed`}
              />
            )}
          </div>
        </Surface>
      )}

      {/* Part-to-whole. The segments are direct-labelled below rather than left
          to colour alone: the category hues sit inside the CVD floor band. */}
      {shares.length > 0 && (
        <Surface borderRadius={28} className="animate-row-in" style={{ animationDelay: "120ms" }}>
          <div className="px-5 py-5 flex flex-col gap-4 w-full">
            <span className="font-sans text-xs text-muted font-semibold">Where it went</span>
            <div className="flex gap-0.5 h-2.5 w-full">
              {shares.map((s) => (
                <span
                  key={s.category}
                  className="h-full rounded-full"
                  style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                />
              ))}
            </div>
            <div className="flex flex-col gap-2.5">
              {shares.map((s) => (
                <div key={s.category} className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="font-sans text-body text-ink/80 flex-1 truncate">{s.category}</span>
                  <span className="font-mono text-sm text-muted w-10 text-right">{s.pct.toFixed(0)}%</span>
                  <span className="font-mono text-sm text-ink w-24 text-right truncate">
                    {mask(formatAmount(s.amount, currency))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Surface>
      )}

      {/* Before and after on one scale, so the size of the move is the picture */}
      {prevTop && (
        <Surface borderRadius={28} className="animate-row-in" style={{ animationDelay: "180ms" }}>
          <div className="px-5 py-5 flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between gap-3">
              <span className="font-sans text-xs text-muted font-semibold">
                {prevTop.category} vs {prevLabel}
              </span>
              <span
                className={`font-mono text-xs font-semibold ${
                  prevTop.amount > prevTop.prev ? "text-danger" : "text-accent"
                }`}
              >
                {prevTop.amount > prevTop.prev ? "↑" : "↓"}{" "}
                {Math.abs(((prevTop.amount - prevTop.prev) / prevTop.prev) * 100).toFixed(0)}%
              </span>
            </div>
            {(() => {
              const scale = Math.max(prevTop.amount, prevTop.prev);
              const at = (v: number) => `${(v / scale) * 100}%`;
              const lo = Math.min(prevTop.amount, prevTop.prev);
              const hi = Math.max(prevTop.amount, prevTop.prev);
              return (
                <div className="relative h-3 mx-1.5">
                  <span
                    className="absolute top-1/2 -translate-y-1/2 h-0.5 rounded-full bg-ink/15"
                    style={{ left: at(lo), width: `calc(${at(hi)} - ${at(lo)})` }}
                  />
                  <span
                    className="absolute top-1/2 w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/30"
                    style={{ left: at(prevTop.prev) }}
                  />
                  <span
                    className="absolute top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ left: at(prevTop.amount), backgroundColor: prevTop.color }}
                  />
                </div>
              );
            })()}
            {/* Tied to the dots by swatch and month, not by position: the two
                values sit at the edges while their dots sit wherever the scale
                puts them. */}
            <div className="flex items-baseline justify-between font-mono text-sm gap-3">
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-ink/30 flex-shrink-0" />
                <span className="text-muted truncate">{prevLabel} {mask(formatAmount(prevTop.prev, currency))}</span>
              </span>
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: prevTop.color }} />
                <span className="text-ink font-semibold truncate">{mask(formatAmount(prevTop.amount, currency))}</span>
              </span>
            </div>
          </div>
        </Surface>
      )}
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
  budget,
}: Props) {
  const [prevExpenses, setPrevExpenses] = useState<Expense[]>([]);
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
          <Overview
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
