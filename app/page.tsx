"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ChevronDown, Download, MoreHorizontal, Sun, Moon } from "lucide-react";
import { CreditCard, ArrowsClockwise, Wallet, Lightbulb, Eye, EyeClosed, ArrowsLeftRight } from "@phosphor-icons/react";
import type { User } from "@supabase/supabase-js";
import { getExpensesByMonth, getSubscriptions, onAuthStateChange, signOut, getUserSettings, upsertUserSettings } from "@/lib/supabase";
import type { Expense, Subscription } from "@/types";
import { CURRENCIES, DEFAULT_CURRENCY, formatAmount } from "@/lib/currencies";
import { exportExpensesCSV, exportSubscriptionsCSV } from "@/lib/export";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Ripple } from "@/components/ui/ripple";
import GradualBlur from "@/components/GradualBlur";
import AddExpenseForm from "@/components/expense/AddExpenseForm";
import GlassSurface from "@/components/GlassSurface";
import Logo from "@/components/Logo";
import AuthForm from "@/components/AuthForm";
import StatsBar from "@/components/StatsBar";
import BudgetBar from "@/components/BudgetBar";
import ExpenseList from "@/components/expense/ExpenseList";
import SubscriptionList from "@/components/subscription/SubscriptionList";
import IncomeSection from "@/components/analytics/IncomeSection";
import AnalyticsView from "@/components/analytics/AnalyticsView";
import BottomDrawer from "@/components/BottomDrawer";
import CurrencyConverter from "@/components/CurrencyConverter";
import { usePrivacy } from "@/components/PrivacyContext";
import { useTheme } from "@/components/ThemeContext";
import { isNative } from "@/lib/platform";
import { isBiometryAvailable, isAppLockEnabled, setAppLockEnabled, authenticate } from "@/lib/appLock";
import { areRemindersEnabled, setRemindersEnabled, requestPermission, syncBillingReminders } from "@/lib/notifications";
import { publishWidgetSnapshot } from "@/lib/widget";

type Filter = "all" | "today" | "week";
type View = "expenses" | "subscriptions" | "income" | "insights";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function startOfWeekISO() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export default function Home() {
  const now = new Date();
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>("expenses");
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [budget, setBudget] = useState<number | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState<number | null>(null);
  const [incomeTotalHero, setIncomeTotalHero] = useState(0);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const [showConverterDrawer, setShowConverterDrawer] = useState(false);
  const [expandedSection, setExpandedSection] = useState<"month" | "currency" | null>(null);
  const [pickerYear, setPickerYear] = useState(now.getFullYear());
  const [native, setNative] = useState(false);
  const [biometryAvailable, setBiometryAvailable] = useState(false);
  const [appLock, setAppLock] = useState(false);
  const [billingReminders, setBillingReminders] = useState(false);
  const currencyRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { privacyMode, togglePrivacy, mask } = usePrivacy();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!showMoreDrawer) setExpandedSection(null);
  }, [showMoreDrawer]);

  useEffect(() => {
    if (expandedSection === "month") setPickerYear(selectedMonth.year);
  }, [expandedSection]);

  // Fast init from localStorage (avoids flash on load)
  useEffect(() => {
    const c = localStorage.getItem("minti_currency");
    if (c) setCurrency(c);
    const b = localStorage.getItem("minti_budget");
    if (b) setBudget(parseFloat(b));
    const mi = localStorage.getItem("minti_monthly_income");
    if (mi) setMonthlyIncome(parseFloat(mi));
  }, []);

  // Sync settings from DB once user is known, migrate localStorage if first time
  useEffect(() => {
    if (!user) return;
    getUserSettings().then((settings) => {
      if (settings) {
        setCurrency(settings.currency);
        localStorage.setItem("minti_currency", settings.currency);
        setBudget(settings.budget ?? null);
        if (settings.budget != null) localStorage.setItem("minti_budget", String(settings.budget));
        setMonthlyIncome(settings.monthly_income ?? null);
        if (settings.monthly_income != null) localStorage.setItem("minti_monthly_income", String(settings.monthly_income));
      } else {
        const c = localStorage.getItem("minti_currency");
        const b = localStorage.getItem("minti_budget");
        const mi = localStorage.getItem("minti_monthly_income");
        const toSave: { currency?: string; budget?: number; monthly_income?: number } = {};
        if (c) toSave.currency = c;
        if (b) toSave.budget = parseFloat(b);
        if (mi) toSave.monthly_income = parseFloat(mi);
        if (Object.keys(toSave).length > 0) upsertUserSettings(toSave).catch(() => {});
      }
    }).catch(() => {});
  }, [user]);

  const selectCurrency = useCallback((code: string) => {
    setCurrency(code);
    localStorage.setItem("minti_currency", code);
    setShowCurrencyPicker(false);
    upsertUserSettings({ currency: code }).catch(() => {});
  }, []);

  const saveBudget = useCallback((value: number) => {
    setBudget(value);
    localStorage.setItem("minti_budget", String(value));
    upsertUserSettings({ budget: value }).catch(() => {});
  }, []);

  const saveMonthlyIncome = useCallback((value: number | null) => {
    setMonthlyIncome(value);
    if (value != null) {
      localStorage.setItem("minti_monthly_income", String(value));
    } else {
      localStorage.removeItem("minti_monthly_income");
    }
  }, []);

  // Close picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) {
        setShowCurrencyPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange(setUser);
    return () => subscription.unsubscribe();
  }, []);

  const fetchExpenses = useCallback(async () => {
    const cacheKey = `minti_expenses_${selectedMonth.year}_${selectedMonth.month}`;
    setLoading(true);
    setFetchError(null);
    try {
      const data = await getExpensesByMonth(selectedMonth.year, selectedMonth.month);
      setExpenses(data);
      try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch { /* quota exceeded */ }
    } catch {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try { setExpenses(JSON.parse(cached)); } catch { /* ignore corrupt cache */ }
      } else {
        setFetchError("Could not load expenses. Check your connection.");
      }
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  const fetchSubscriptions = useCallback(async () => {
    const cacheKey = "minti_subscriptions";
    try {
      const data = await getSubscriptions();
      setSubscriptions(data);
      try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch { /* quota exceeded */ }
    } catch {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try { setSubscriptions(JSON.parse(cached)); } catch { /* ignore corrupt cache */ }
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchExpenses();
  }, [fetchExpenses, user]);

  useEffect(() => {
    if (user) fetchSubscriptions();
  }, [user, fetchSubscriptions]);

  function prevMonth() {
    setSelectedMonth(({ year, month }) => {
      if (month === 1) return { year: year - 1, month: 12 };
      return { year, month: month - 1 };
    });
  }

  function nextMonth() {
    setSelectedMonth(({ year, month }) => {
      if (month === 12) return { year: year + 1, month: 1 };
      return { year, month: month + 1 };
    });
  }

  useEffect(() => {
    if (!isNative()) return;
    setNative(true);
    isBiometryAvailable().then(setBiometryAvailable);
    isAppLockEnabled().then(setAppLock);
    areRemindersEnabled().then(setBillingReminders);
  }, []);

  useEffect(() => {
    if (!isNative() || !user) return;
    syncBillingReminders(subscriptions, currency).catch(() => {});
  }, [user, subscriptions, currency, billingReminders]);

  async function toggleAppLock() {
    const next = !appLock;
    if (next && !(await authenticate())) return;
    await setAppLockEnabled(next);
    setAppLock(next);
  }

  async function toggleBillingReminders() {
    const next = !billingReminders;
    if (next && !(await requestPermission())) return;
    await setRemindersEnabled(next);
    setBillingReminders(next);
  }

  function exportCSV() {
    const done =
      view === "expenses"
        ? exportExpensesCSV(expenses, currency, selectedMonth)
        : exportSubscriptionsCSV(subscriptions, currency);
    done.catch(() => {});
  }

  const subscriptionsTotal = useMemo(
    () => subscriptions.reduce((s, sub) => s + Number(sub.amount), 0),
    [subscriptions]
  );

  const expensesTotal = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount), 0),
    [expenses]
  );

  useEffect(() => {
    if (!native || !user) return;
    const today = new Date();
    const isCurrentMonth =
      selectedMonth.year === today.getFullYear() && selectedMonth.month === today.getMonth() + 1;
    if (!isCurrentMonth) return;
    publishWidgetSnapshot({
      spent: expensesTotal + subscriptionsTotal,
      budget,
      currency,
      month: `${MONTH_NAMES[selectedMonth.month - 1]} ${selectedMonth.year}`,
    }).catch(() => {});
  }, [native, user, expensesTotal, subscriptionsTotal, budget, currency, selectedMonth]);

  const filteredExpenses = useMemo(() => {
    if (filter === "today") return expenses.filter((e) => e.date === todayISO());
    if (filter === "week") return expenses.filter((e) => e.date >= startOfWeekISO());
    return expenses;
  }, [expenses, filter]);

  const filters: { key: Filter; label: string }[] = [
    { key: "all",   label: "All"       },
    { key: "today", label: "Today"     },
    { key: "week",  label: "This Week" },
  ];

  if (user === undefined) {
    return (
      <main className="relative z-10 min-h-screen flex items-center justify-center">
        <Ripple className="w-11 h-11 text-accent" />
      </main>
    );
  }

  if (user === null) {
    return (
      <main className="relative z-10 text-text sm:min-h-screen sm:flex sm:items-center sm:justify-center sm:px-4" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="w-full sm:max-w-sm">
          <AuthForm />
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="relative z-10 min-h-screen text-text">
      <GradualBlur target="page" position="bottom" height="5rem" strength={1.5} divCount={6} curve="bezier" zIndex={10} className="hidden sm:block" />
      <div
        className="sm:hidden fixed bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: 'calc(env(safe-area-inset-bottom) + 6rem)',
          background: 'linear-gradient(to bottom, transparent, rgb(var(--background)) 70%)',
          zIndex: 45,
        }}
      />
      {/* Currency converter drawer */}
      <BottomDrawer
        open={showConverterDrawer}
        onClose={() => setShowConverterDrawer(false)}
        title="Convert Currency"
        fullScreen
      >
        <CurrencyConverter defaultFrom={currency} />
      </BottomDrawer>

      {/* Currency picker drawer — desktop */}
      <BottomDrawer
        open={showCurrencyPicker}
        onClose={() => setShowCurrencyPicker(false)}
        title="Select Currency"
      >
        {CURRENCIES.map((c) => (
          <button
            key={c.code}
            onClick={() => selectCurrency(c.code)}
            className={`w-full flex items-center justify-between px-4 py-4 text-sm transition-colors border-b border-ink/10 last:border-0 ${
              currency === c.code
                ? "text-accent bg-accent-fill/10"
                : "text-ink hover:bg-ink/[0.07]"
            }`}
          >
            <span className="font-mono font-semibold text-base">{c.code}</span>
            <span className="text-sm text-ink/50">{c.name}</span>
          </button>
        ))}
      </BottomDrawer>

      {/* Menu drawer — mobile only */}
      <BottomDrawer
        open={showMoreDrawer}
        onClose={() => setShowMoreDrawer(false)}
        title="Menu"
      >
        {/* Month row + inline calendar */}
        <button
          onClick={() => setExpandedSection(s => s === "month" ? null : "month")}
          aria-expanded={expandedSection === "month"}
          className="w-full flex items-center justify-between px-4 py-4 text-[15px] text-ink hover:bg-ink/[0.07] transition-colors"
        >
          <span className="text-ink/60">Month</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold">{MONTH_NAMES[selectedMonth.month - 1]} {selectedMonth.year}</span>
            <ChevronDown size={13} className={`text-ink/40 transition-transform duration-200 ${expandedSection === "month" ? "rotate-180" : ""}`} />
          </div>
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-out ${expandedSection === "month" ? "max-h-64" : "max-h-0"}`}>
          <div className="px-4 pt-3 pb-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setPickerYear(y => y - 1)}
                className="w-10 h-10 flex items-center justify-center rounded-full border border-ink/[0.1] bg-ink/[0.07] text-ink/40 hover:text-ink/90 transition-colors"
              >‹</button>
              <span className="font-mono text-sm font-semibold text-ink">{pickerYear}</span>
              <button
                onClick={() => setPickerYear(y => y + 1)}
                className="w-10 h-10 flex items-center justify-center rounded-full border border-ink/[0.1] bg-ink/[0.07] text-ink/40 hover:text-ink/90 transition-colors"
              >›</button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {MONTH_NAMES.map((name, i) => {
                const month = i + 1;
                const isSelected = pickerYear === selectedMonth.year && month === selectedMonth.month;
                return (
                  <button
                    key={month}
                    onClick={() => { setSelectedMonth({ year: pickerYear, month }); setExpandedSection(null); setShowMoreDrawer(false); }}
                    className={`h-10 rounded-full text-sm font-mono transition-colors ${
                      isSelected
                        ? "bg-accent-fill/15 text-accent border border-accent-fill/30 font-semibold"
                        : "text-ink/40 hover:text-ink/80"
                    }`}
                  >{name}</button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Currency row + inline list */}
        <button
          onClick={() => setExpandedSection(s => s === "currency" ? null : "currency")}
          aria-expanded={expandedSection === "currency"}
          className="w-full flex items-center justify-between px-4 py-4 text-[15px] text-ink hover:bg-ink/[0.07] transition-colors"
        >
          <span className="text-ink/60">Currency</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold">{currency}</span>
            <ChevronDown size={13} className={`text-ink/40 transition-transform duration-200 ${expandedSection === "currency" ? "rotate-180" : ""}`} />
          </div>
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-out ${expandedSection === "currency" ? "max-h-64" : "max-h-0"}`}>
          <div className="overflow-y-auto max-h-64">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                onClick={() => { selectCurrency(c.code); setExpandedSection(null); }}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                  currency === c.code ? "text-accent bg-accent-fill/10" : "text-ink hover:bg-ink/[0.07]"
                }`}
              >
                <span className="font-mono font-semibold text-base">{c.code}</span>
                <span className="text-sm text-ink/50">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Insights */}
        <button
          onClick={() => { setShowMoreDrawer(false); setView("insights"); }}
          className="w-full flex items-center justify-between px-4 py-4 text-[15px] text-ink hover:bg-ink/[0.07] transition-colors"
        >
          <span className="text-ink/60">Insights</span>
          <Lightbulb size={14} className="text-ink/40" />
        </button>

        {/* Currency converter */}
        <button
          onClick={() => { setShowMoreDrawer(false); setShowConverterDrawer(true); }}
          className="w-full flex items-center justify-between px-4 py-4 text-[15px] text-ink hover:bg-ink/[0.07] transition-colors"
        >
          <span className="text-ink/60">Convert currency</span>
          <ArrowsLeftRight size={14} className="text-ink/40" />
        </button>

        {/* Export CSV */}
        <button
          onClick={() => {
            exportCSV();
            setShowMoreDrawer(false);
          }}
          className="w-full flex items-center justify-between px-4 py-4 text-[15px] text-ink hover:bg-ink/[0.07] transition-colors"
        >
          <span className="text-ink/60">Export CSV</span>
          <Download size={14} className="text-ink/40" />
        </button>
        {/* Native-only settings */}
        {native && biometryAvailable && (
          <button
            onClick={toggleAppLock}
            role="switch"
            aria-checked={appLock}
            className="w-full flex items-center justify-between px-4 py-4 text-[15px] text-ink hover:bg-ink/[0.07] transition-colors"
          >
            <span className="text-ink/60">Require Face ID</span>
            <span className={`font-mono text-xs font-semibold ${appLock ? "text-accent" : "text-ink/40"}`}>
              {appLock ? "ON" : "OFF"}
            </span>
          </button>
        )}
        {native && (
          <button
            onClick={toggleBillingReminders}
            role="switch"
            aria-checked={billingReminders}
            className="w-full flex items-center justify-between px-4 py-4 text-[15px] text-ink hover:bg-ink/[0.07] transition-colors"
          >
            <span className="text-ink/60">Billing reminders</span>
            <span className={`font-mono text-xs font-semibold ${billingReminders ? "text-accent" : "text-ink/40"}`}>
              {billingReminders ? "ON" : "OFF"}
            </span>
          </button>
        )}
        {/* Sign out */}
        <button
          onClick={() => { signOut(); setShowMoreDrawer(false); }}
          className="w-full flex items-center justify-between px-4 py-4 text-[15px] text-danger hover:bg-ink/[0.07] transition-colors"
        >
          <span>Sign out</span>
          <LogOut size={14} />
        </button>
      </BottomDrawer>

      {/* Bottom nav — mobile only */}
      <nav aria-label="Primary" className="sm:hidden fixed bottom-0 left-0 right-0 z-50 px-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.25rem)' }}>
        <div className="flex items-center h-16 p-1.5 rounded-3xl border flat-chip">
          {([
            { key: "expenses", label: "Expenses", Icon: CreditCard },
            { key: "subscriptions", label: "Bills", Icon: ArrowsClockwise },
            { key: "income", label: "Income", Icon: Wallet },
          ] as { key: View; label: string; Icon: React.ElementType }[]).map(({ key, label, Icon }) => {
            const active = view === key;
            return (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`flex-1 h-full flex flex-col items-center justify-center gap-1 rounded-full text-xs font-mono transition-all ${
                  active
                    ? "flat-chip-active text-ink border"
                    : "text-ink/35 hover:text-ink/70"
                }`}
              >
                <Icon size={22} weight={active ? "fill" : "regular"} />
                <span>{label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setView("insights")}
            className={`flex-1 h-full flex flex-col items-center justify-center gap-1 rounded-full text-xs font-mono transition-all ${
              view === "insights"
                ? "flat-chip-active text-ink border"
                : "text-ink/35 hover:text-ink/70"
            }`}
          >
            <Lightbulb size={22} weight={view === "insights" ? "fill" : "regular"} />
            <span>Insights</span>
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 pb-28 sm:pb-24 flex flex-col gap-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>

        {/* Header */}
        <header className="flex flex-col gap-5">
          {/* Row 1: Logo + Sign out */}
          <div className="flex items-center justify-between pt-1 pb-2">
            <Logo className="h-5 w-auto" />
            <div className="flex items-center gap-2">
              <button
                onClick={togglePrivacy}
                aria-label={privacyMode ? "Show amounts" : "Hide amounts"}
                className={`w-10 h-10 flex items-center justify-center rounded-full border transition-colors ${
                  privacyMode
                    ? "border-accent-fill/40 bg-accent-fill/10 text-accent"
                    : "flat-chip text-ink/40 hover:text-ink/90"
                }`}
              >
                {privacyMode ? <EyeClosed size={16} /> : <Eye size={16} />}
              </button>
              <button
                onClick={toggleTheme}
                aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                className="w-10 h-10 flex items-center justify-center rounded-full border flat-chip text-ink/40 hover:text-ink/90 transition-colors"
              >
                {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              </button>
              <button
                onClick={() => setShowMoreDrawer(true)}
                aria-label="Menu"
                className="sm:hidden w-10 h-10 flex items-center justify-center rounded-full border flat-chip text-ink/40 hover:text-ink/90 transition-colors"
              >
                <MoreHorizontal size={14} />
              </button>
              <button
                onClick={() => signOut()}
                aria-label="Sign out"
                className="hidden sm:flex w-10 h-10 items-center justify-center rounded-full border flat-chip text-ink/40 hover:text-ink/90 transition-colors"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>

          {/* Row 2 (desktop): Currency + Export + Month nav */}
          <div className="hidden sm:flex items-center gap-2 w-full justify-between">
            {/* Currency picker */}
            <div ref={currencyRef} className="relative">
              <button
                onClick={() => setShowCurrencyPicker((v) => !v)}
                className="flex items-center gap-1 h-10 px-3 rounded-full border flat-chip text-ink/40 hover:text-ink/90 transition-colors text-xs font-mono"
              >
                {currency}
                <ChevronDown size={11} />
              </button>
            </div>

            {/* Export + Month nav */}
            <div className="flex items-center gap-2">
              <button
                onClick={exportCSV}
                aria-label="Export CSV"
                className="flex items-center gap-1.5 h-10 px-3 rounded-full border flat-chip text-ink/40 hover:text-ink/90 transition-colors text-xs font-mono"
              >
                <Download size={12} />
                CSV
              </button>
              <button
                onClick={() => setShowConverterDrawer(true)}
                aria-label="Convert currency"
                className="w-10 h-10 flex items-center justify-center rounded-full border flat-chip text-ink/40 hover:text-ink/90 transition-colors"
              >
                <ArrowsLeftRight size={14} />
              </button>
              <button
                onClick={prevMonth}
                aria-label="Previous month"
                className="w-10 h-10 flex items-center justify-center rounded-full border flat-chip text-ink/40 hover:text-ink/90 transition-colors"
              >
                ‹
              </button>
              <span className="font-sans text-[15px] text-ink font-medium min-w-[72px] text-center">
                {MONTH_NAMES[selectedMonth.month - 1]} {selectedMonth.year}
              </span>
              <button
                onClick={nextMonth}
                aria-label="Next month"
                className="w-10 h-10 flex items-center justify-center rounded-full border flat-chip text-ink/40 hover:text-ink/90 transition-colors"
              >
                ›
              </button>
            </div>
          </div>
          {/* Row 3: View toggle (full width) — desktop only */}
          <nav aria-label="Sections" className="hidden sm:flex items-center h-10 p-0.5 rounded-full border flat-chip w-full">
            {(["expenses", "subscriptions", "income"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex-1 h-9 rounded-full text-sm font-mono transition-colors ${
                  view === v
                    ? "flat-chip-active text-ink border"
                    : "text-ink/40 hover:text-ink/80"
                }`}
              >
                {v === "expenses" ? "Expenses" : v === "subscriptions" ? "Subscriptions" : "Income"}
              </button>
            ))}
          </nav>
        </header>

        {/* Stats */}
        {view === "expenses" && (
          <StatsBar expenses={expenses} selectedMonth={selectedMonth} currency={currency} subscriptionsTotal={subscriptionsTotal} />
        )}
        {view === "subscriptions" && (
          <div className="flex flex-col gap-2">
            <div className="px-1 pt-2 pb-5 flex flex-col gap-1">
              <span className="font-sans text-xs text-muted uppercase tracking-wider font-semibold leading-none">Monthly Bills</span>
              <span className="font-mono text-5xl font-bold text-ink leading-tight">{mask(formatAmount(subscriptionsTotal, currency))}</span>
            </div>
            <GlassSurface borderRadius={28}>
              <div className="w-full grid grid-cols-2 divide-x divide-ink/[0.07]">
                <div className="px-5 py-4 flex flex-col gap-1">
                  <span className="font-sans text-xs text-muted uppercase tracking-wider font-semibold leading-none">Active</span>
                  <span className="font-mono text-2xl font-bold text-ink leading-tight">{privacyMode ? "•" : subscriptions.length}</span>
                </div>
                <div className="px-5 py-4 flex flex-col gap-1">
                  <span className="font-sans text-xs text-muted uppercase tracking-wider font-semibold leading-none">Per Year</span>
                  <span className="font-mono text-2xl font-bold text-ink leading-tight">{mask(formatAmount(subscriptionsTotal * 12, currency))}</span>
                </div>
              </div>
            </GlassSurface>
          </div>
        )}
        {view === "income" && (
          <div className="px-1 pt-2 pb-5 flex flex-col gap-1">
            <span className="font-sans text-xs text-muted uppercase tracking-wider font-semibold leading-none">Monthly Income</span>
            <span className="font-mono text-5xl font-bold text-ink leading-tight">{mask(formatAmount(incomeTotalHero, currency))}</span>
          </div>
        )}

        {view === "expenses" ? (
          <>
            {/* Add form */}
            <AddExpenseForm userId={user.id} currency={currency} onExpenseAdded={fetchExpenses} />

            {/* Budget */}
            <BudgetBar spent={expensesTotal + subscriptionsTotal} currency={currency} budget={budget} onBudgetSave={saveBudget} />

            {/* Filter tabs */}
            <GlassSurface borderRadius={28} backgroundOpacity={0.07}>
              <div className="flex gap-1 p-1 w-full">
                {filters.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`flex-1 py-2 text-sm font-mono rounded-full transition-colors ${
                      filter === key
                        ? "flat-chip-active text-ink font-semibold border"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </GlassSurface>

            {/* Expense list / loading / error */}
            <div key={filter} className="animate-fade-slide-in">
              {fetchError ? (
                <div className="bg-ink/[0.07] rounded-xl border border-danger-fill/40 p-5 text-center">
                  <p className="text-danger font-mono text-sm">{fetchError}</p>
                  <button onClick={fetchExpenses} className="mt-3 text-xs font-mono text-muted underline hover:text-ink">
                    Retry
                  </button>
                </div>
              ) : loading ? (
                <LoadingSkeleton />
              ) : (
                <ExpenseList
                  expenses={filteredExpenses}
                  onDeleted={fetchExpenses}
                  onUpdated={fetchExpenses}
                  currency={currency}
                />
              )}
            </div>

          </>
        ) : view === "subscriptions" ? (
          <>
            <BudgetBar spent={expensesTotal + subscriptionsTotal} currency={currency} budget={budget} onBudgetSave={saveBudget} />
            <SubscriptionList
              subscriptions={subscriptions}
              userId={user.id}
              currency={currency}
              onChanged={fetchSubscriptions}
            />
          </>
        ) : view === "income" ? (
          <IncomeSection
            user={user}
            selectedMonth={selectedMonth}
            currency={currency}
            monthlyIncome={monthlyIncome}
            onMonthlyIncomeChange={saveMonthlyIncome}
            expenses={expenses}
            subscriptions={subscriptions}
            onTotalChange={setIncomeTotalHero}
          />
        ) : (
          <AnalyticsView
            expenses={expenses}
            subscriptions={subscriptions}
            selectedMonth={selectedMonth}
            currency={currency}
            monthlyIncome={monthlyIncome}
          />
        )}
      </div>
    </main>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {[0, 1].map((g) => (
        <div key={g}>
          <div className="flex justify-between mb-2 px-1">
            <div className="h-3 w-16 bg-ink/[0.07] rounded" />
            <div className="h-3 w-20 bg-ink/[0.07] rounded" />
          </div>
          <div className="bg-ink/[0.04] rounded-xl border border-ink/[0.07] overflow-hidden divide-y divide-ink/[0.08]">
            {[0, 1, 2].map((r) => (
              <div key={r} className="flex items-center gap-3 px-4 py-3">
                <div className="w-2.5 h-2.5 rounded-full bg-ink/[0.07] flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-3 w-2/3 bg-ink/[0.07] rounded" />
                  <div className="h-2.5 w-1/4 bg-ink/[0.07] rounded-full" />
                </div>
                <div className="h-3 w-20 bg-ink/[0.07] rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
