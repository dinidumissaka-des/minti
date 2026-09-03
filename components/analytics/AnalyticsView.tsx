"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { AlertTriangle, CalendarDays, Gauge, PieChart, PiggyBank, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
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
// A grid of tiles rather than a column of sentences: each figure is the loudest
// thing in its own tile, and the tile is coloured by what it is — the two brand
// fills for the month and what it kept, a wash of the category's own colour for
// where it went, a wash of accent or danger for the direction of travel.

type TileTone = "chip" | "accent" | "danger" | "good" | "plain";

const TONES: Record<TileTone, { tile: string; icon: string; value: string; label: string }> = {
  // The documented pairings: a solid brand fill carries the text made for it.
  chip:   { tile: "bg-chip",             icon: "text-chip-on/70",   value: "text-chip-on",   label: "text-chip-on/70" },
  accent: { tile: "bg-accent-fill",      icon: "text-accent-on/70", value: "text-accent-on", label: "text-accent-on/70" },
  danger: { tile: "bg-danger-fill/15",   icon: "text-danger",       value: "text-danger",    label: "text-muted" },
  // There is no green wash in this system — the -fill token at low alpha reads
  // as a stain — so a good-news tile that is not the green fill marks itself
  // with the green as a bare mark instead.
  good:   { tile: "bg-surface",          icon: "text-brand",        value: "text-ink",       label: "text-muted" },
  plain:  { tile: "bg-surface",          icon: "text-ink/40",       value: "text-ink",       label: "text-muted" },
};

function Tile({
  icon,
  value,
  label,
  sub,
  tone = "plain",
  color,
  wide,
  delay,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  sub?: string;
  tone?: TileTone;
  /** A category's own colour, washed for the tile and solid for the icon. */
  color?: string;
  wide?: boolean;
  delay: number;
}) {
  const t = TONES[tone];
  return (
    <div
      className={`animate-row-in rounded-2xl p-4 flex flex-col gap-3 min-w-0 ${wide ? "col-span-2" : ""} ${color ? "" : t.tile}`}
      style={{ animationDelay: `${delay}ms`, ...(color ? { backgroundColor: `${color}26` } : null) }}
    >
      <span className={color ? "" : t.icon} style={color ? { color } : undefined}>{icon}</span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span
          className={`font-mono font-bold leading-none truncate ${wide ? "text-4xl" : "text-2xl"} ${color ? "text-ink" : t.value}`}
        >
          {value}
        </span>
        <span className={`font-sans text-sm font-semibold truncate ${color ? "text-ink/80" : t.label}`}>{label}</span>
        {sub && <span className={`font-mono text-xs truncate ${color ? "text-muted" : t.label}`}>{sub}</span>}
      </div>
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

  const amount = (v: number) => mask(formatAmount(v, currency));

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
  const limit = budget ?? monthlyIncome ?? null;
  const over = limit != null && projected > limit;

  const saved = monthlyIncome != null ? monthlyIncome - total : null;

  const momPct = useMemo(() => {
    if (stats.length === 0 || prevExpenses.length === 0) return null;
    const top = stats[0];
    const prev = prevExpenses
      .filter((e) => e.category === top.category)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    if (prev <= 0) return null;
    return { category: top.category, pct: ((top.amount - prev) / prev) * 100 };
  }, [stats, prevExpenses]);

  const prevLabel = useMemo(() => {
    const { year, month } = prevMonthOf(selectedMonth.year, selectedMonth.month);
    return new Date(year, month - 1, 1).toLocaleDateString("en", { month: "short" });
  }, [selectedMonth]);

  if (total === 0) return null;

  const top = stats[0];
  let delay = 0;
  const next = () => (delay += 60);

  return (
    // The hero spans both columns, so a trailing tile is alone in its row when
    // its index is even. It takes the whole row rather than leaving a hole.
    <div className="grid grid-cols-2 gap-3 [&>*:last-child:nth-child(even)]:col-span-2">
      {/* The alarm is the icon and the words, not the fill: this tile is the
          month, and the month keeps its colour whether or not it is going
          badly. */}
      <Tile
        wide
        tone="chip"
        icon={over ? <AlertTriangle size={22} /> : <CalendarDays size={22} />}
        value={`${amount(projected)} ${currency}`}
        label={isCurrentMonth ? "On track this month" : "Spent this month"}
        sub={
          limit != null
            ? over
              ? `${amount(projected - limit)} over ${budget == null ? "income" : "budget"}`
              : `of ${amount(limit)} ${budget == null ? "income" : "budget"}`
            : `day ${elapsed} of ${totalDays}`
        }
        delay={0}
      />

      {saved != null && (
        <Tile
          tone={saved >= 0 ? "accent" : "danger"}
          icon={saved >= 0 ? <PiggyBank size={22} /> : <TrendingDown size={22} />}
          value={amount(Math.abs(saved))}
          label={saved >= 0 ? "Saved" : "Over income"}
          sub={monthlyIncome ? `${Math.abs((saved / monthlyIncome) * 100).toFixed(0)}% of income` : undefined}
          delay={next()}
        />
      )}

      {top && (
        <Tile
          color={top.color}
          icon={<PieChart size={22} />}
          value={`${top.pct.toFixed(0)}%`}
          label={top.category}
          sub={`${amount(top.amount)} ${currency}`}
          delay={next()}
        />
      )}

      <Tile
        icon={<Gauge size={22} />}
        value={amount(avgDay)}
        label="Per day"
        sub={`over ${elapsed} day${elapsed === 1 ? "" : "s"}`}
        delay={next()}
      />

      {subscriptions.length > 0 && (
        <Tile
          icon={<RefreshCw size={22} />}
          value={String(subscriptions.length)}
          label={`Bill${subscriptions.length === 1 ? "" : "s"}`}
          sub={`${amount(subTotal)} fixed`}
          delay={next()}
        />
      )}

      {momPct && (
        <Tile
          tone={momPct.pct > 0 ? "danger" : "good"}
          icon={momPct.pct > 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          value={`${momPct.pct > 0 ? "+" : "−"}${Math.abs(momPct.pct).toFixed(0)}%`}
          label={momPct.category}
          sub={`vs ${prevLabel}`}
          delay={next()}
        />
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
