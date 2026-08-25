"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { LogOut, ChevronDown, Download, MoreHorizontal, Sun, Moon, Plus } from "lucide-react";
import { CreditCard, ArrowsClockwise, Wallet, Lightbulb, Eye, EyeClosed, ArrowsLeftRight } from "@phosphor-icons/react";
import type { User } from "@supabase/supabase-js";
import { getExpensesByMonth, getSubscriptions, onAuthStateChange, signOut, getUserSettings, upsertUserSettings } from "@/lib/supabase";
import type { Expense, Subscription } from "@/types";
import { CURRENCIES, DEFAULT_CURRENCY, formatAmount } from "@/lib/currencies";
import { exportExpensesCSV, exportSubscriptionsCSV } from "@/lib/export";
import { expensesKey, subscriptionsKey, budgetKey, monthlyIncomeKey, rememberUser, lastUserId, clearUserData, purgeLegacyCache } from "@/lib/localCache";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Ripple } from "@/components/ui/ripple";
import SegmentedControl, { type Segment } from "@/components/ui/SegmentedControl";
import ViewTransition from "@/components/ui/ViewTransition";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import Collapse from "@/components/ui/Collapse";
import GradualBlur from "@/components/GradualBlur";
import AddExpenseForm from "@/components/expense/AddExpenseForm";
import GlassSurface from "@/components/GlassSurface";
import Logo from "@/components/Logo";
import LogoMark from "@/components/LogoMark";
import AuthForm from "@/components/AuthForm";
import AuthShowcase from "@/components/AuthShowcase";
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
import { hapticTap } from "@/lib/haptics";

type Filter = "all" | "today" | "week";
type View = "expenses" | "subscriptions" | "income" | "insights";

// Nav order, so a view change knows which way the content should travel.
const VIEW_ORDER: View[] = ["expenses", "subscriptions", "income", "insights"];

const NAV_ITEMS: Segment<View>[] = [
  { key: "expenses",      label: (a) => <><CreditCard size={22} weight={a ? "fill" : "regular"} /><span>Expenses</span></> },
  { key: "subscriptions", label: (a) => <><ArrowsClockwise size={22} weight={a ? "fill" : "regular"} /><span>Bills</span></> },
  { key: "income",        label: (a) => <><Wallet size={22} weight={a ? "fill" : "regular"} /><span>Income</span></> },
  { key: "insights",      label: (a) => <><Lightbulb size={22} weight={a ? "fill" : "regular"} /><span>Insights</span></> },
];

const SECTION_ITEMS: Segment<View>[] = [
  { key: "expenses",      label: "Expenses" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "income",        label: "Income" },
];

const FILTER_ITEMS: Segment<Filter>[] = [
  { key: "all",   label: "All" },
  { key: "today", label: "Today" },
  { key: "week",  label: "This Week" },
];

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

// GradualBlur adds +100 to zIndex for page targets, so this lands the scroll
// edge effect at 5: above scrolling content, below the sticky header (z-content).
// Passing 10 here would put it at 110 and blur the header itself.
const SCROLL_EDGE_Z = -95;

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export default function Home() {
  const now = new Date();
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
  const [viewDir, setViewDir] = useState(1);
  const [monthDir, setMonthDir] = useState(1);
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [budget, setBudget] = useState<number | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState<number | null>(null);
  const [incomeTotalHero, setIncomeTotalHero] = useState(0);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const [showConverterDrawer, setShowConverterDrawer] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [expandedSection, setExpandedSection] = useState<"month" | "currency" | null>(null);
  const [pickerYear, setPickerYear] = useState(now.getFullYear());
  const [native, setNative] = useState(false);
  const [biometryAvailable, setBiometryAvailable] = useState(false);
  const [appLock, setAppLock] = useState(false);
  const [billingReminders, setBillingReminders] = useState(false);
  const currencyRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { privacyMode, togglePrivacy } = usePrivacy();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!showMoreDrawer) setExpandedSection(null);
  }, [showMoreDrawer]);

  useEffect(() => {
    if (expandedSection === "month") setPickerYear(selectedMonth.year);
  }, [expandedSection]);

  // Fast init from localStorage (avoids flash on load). Budget and income are
  // account data, so they are read back only for the account that cached them.
  useEffect(() => {
    purgeLegacyCache();
    const c = localStorage.getItem("minti_currency");
    if (c) setCurrency(c);
    const uid = lastUserId();
    if (!uid) return;
    const b = localStorage.getItem(budgetKey(uid));
    if (b) setBudget(parseFloat(b));
    const mi = localStorage.getItem(monthlyIncomeKey(uid));
    if (mi) setMonthlyIncome(parseFloat(mi));
  }, []);

  // Sync settings from DB once user is known, migrate localStorage if first time
  useEffect(() => {
    if (!user) return;
    rememberUser(user.id);
    getUserSettings().then((settings) => {
      if (settings) {
        setCurrency(settings.currency);
        localStorage.setItem("minti_currency", settings.currency);
        setBudget(settings.budget ?? null);
        if (settings.budget != null) localStorage.setItem(budgetKey(user.id), String(settings.budget));
        setMonthlyIncome(settings.monthly_income ?? null);
        if (settings.monthly_income != null) localStorage.setItem(monthlyIncomeKey(user.id), String(settings.monthly_income));
      } else {
        const c = localStorage.getItem("minti_currency");
        const b = localStorage.getItem(budgetKey(user.id));
        const mi = localStorage.getItem(monthlyIncomeKey(user.id));
        const toSave: { currency?: string; budget?: number; monthly_income?: number } = {};
        if (c) toSave.currency = c;
        if (b) toSave.budget = parseFloat(b);
        if (mi) toSave.monthly_income = parseFloat(mi);
        if (Object.keys(toSave).length > 0) upsertUserSettings(toSave).catch(() => {});
      }
    }).catch(() => {});
  }, [user]);

  // Sign-out has to wipe the cached rows too, or the next person to open this
  // browser can read them straight out of localStorage.
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch {
      // Network failure still means this device should forget the data.
    } finally {
      clearUserData();
      setExpenses([]);
      setSubscriptions([]);
      setBudget(null);
      setMonthlyIncome(null);
    }
  }, []);

  const selectCurrency = useCallback((code: string) => {
    setCurrency(code);
    localStorage.setItem("minti_currency", code);
    setShowCurrencyPicker(false);
    upsertUserSettings({ currency: code }).catch(() => {});
  }, []);

  const saveBudget = useCallback((value: number) => {
    setBudget(value);
    if (user) localStorage.setItem(budgetKey(user.id), String(value));
    upsertUserSettings({ budget: value }).catch(() => {});
  }, [user]);

  const saveMonthlyIncome = useCallback((value: number | null) => {
    setMonthlyIncome(value);
    if (!user) return;
    if (value != null) {
      localStorage.setItem(monthlyIncomeKey(user.id), String(value));
    } else {
      localStorage.removeItem(monthlyIncomeKey(user.id));
    }
  }, [user]);

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
    if (!user) return;
    const cacheKey = expensesKey(user.id, selectedMonth.year, selectedMonth.month);
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
  }, [selectedMonth, user]);

  const fetchSubscriptions = useCallback(async () => {
    if (!user) return;
    const cacheKey = subscriptionsKey(user.id);
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
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchExpenses();
  }, [fetchExpenses, user]);

  useEffect(() => {
    if (user) fetchSubscriptions();
  }, [user, fetchSubscriptions]);

  function prevMonth() {
    setMonthDir(-1);
    setSelectedMonth(({ year, month }) => {
      if (month === 1) return { year: year - 1, month: 12 };
      return { year, month: month - 1 };
    });
  }

  function nextMonth() {
    setMonthDir(1);
    setSelectedMonth(({ year, month }) => {
      if (month === 12) return { year: year + 1, month: 1 };
      return { year, month: month + 1 };
    });
  }

  // Content travels the same way the nav does, so switching sections reads as
  // moving along a row rather than as a replacement.
  const changeView = useCallback(
    (next: View) => {
      if (next === view) return;
      setViewDir(VIEW_ORDER.indexOf(next) >= VIEW_ORDER.indexOf(view) ? 1 : -1);
      hapticTap();
      setView(next);
    },
    [view],
  );

  const selectMonth = useCallback(
    (year: number, month: number) => {
      const curr = selectedMonth.year * 12 + selectedMonth.month;
      setMonthDir(year * 12 + month >= curr ? 1 : -1);
      setSelectedMonth({ year, month });
    },
    [selectedMonth],
  );

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

  if (user === undefined) {
    return (
      <main className="relative z-content min-h-screen flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <Ripple className="absolute w-32 h-32 text-accent" strokeWidth={0.8} />
          <LogoMark className="relative w-14 h-14" />
        </div>
      </main>
    );
  }

  if (user === null) {
    return (
      <main className="relative z-content text-ink/90 sm:min-h-screen sm:flex sm:items-center sm:justify-center sm:px-4 lg:px-8" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Absolute, not fixed: the mobile form scrolls when the keyboard is
            up and a pinned logo would ride over it. */}
        <Logo className="absolute left-6 sm:left-8 top-[calc(env(safe-area-inset-top)+1.5rem)] sm:top-[calc(env(safe-area-inset-top)+2rem)] h-6 w-auto" />
        <div className="w-full sm:max-w-sm lg:max-w-5xl lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
          <AuthForm />
          <AuthShowcase className="hidden lg:flex" />
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="relative z-content min-h-screen text-ink/90">
      <GradualBlur target="page" position="bottom" height="5rem" strength={1.5} divCount={6} curve="bezier" zIndex={10} className="hidden sm:block" />
      {/* Scroll edge effect. Apple: "Optimize for legibility when content
          scrolls beneath controls... obscuring content that scrolls beneath
          them." System bars get this free; the sticky mobile header has to
          ask for it, otherwise the logo sits on raw scrolling text. */}
      <GradualBlur target="page" position="top" height="7.5rem" strength={1.2} divCount={4} curve="bezier" zIndex={SCROLL_EDGE_Z} className="sm:hidden" />
      <div
        className="sm:hidden fixed bottom-0 left-0 right-0 pointer-events-none z-nav-scrim"
        style={{
          height: 'calc(env(safe-area-inset-bottom) + 6rem)',
          background: 'linear-gradient(to bottom, transparent, rgb(var(--background)) 70%)',
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
                : "text-ink hover:bg-ink/7"
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
          className="w-full flex items-center justify-between px-4 py-4 text-body text-ink hover:bg-ink/7 transition-colors"
        >
          <span className="text-ink/60">Month</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold">{MONTH_NAMES[selectedMonth.month - 1]} {selectedMonth.year}</span>
            <ChevronDown size={13} className={`text-ink/40 transition-transform duration-200 ${expandedSection === "month" ? "rotate-180" : ""}`} />
          </div>
        </button>
        <Collapse open={expandedSection === "month"}>
          <div className="px-4 pt-3 pb-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setPickerYear(y => y - 1)}
                className="w-10 h-10 flex items-center justify-center rounded-full border border-ink/10 bg-ink/7 text-ink/40 hover:text-ink/90 transition-colors"
              >‹</button>
              <span className="font-mono text-sm font-semibold text-ink">{pickerYear}</span>
              <button
                onClick={() => setPickerYear(y => y + 1)}
                className="w-10 h-10 flex items-center justify-center rounded-full border border-ink/10 bg-ink/7 text-ink/40 hover:text-ink/90 transition-colors"
              >›</button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {MONTH_NAMES.map((name, i) => {
                const month = i + 1;
                const isSelected = pickerYear === selectedMonth.year && month === selectedMonth.month;
                return (
                  <button
                    key={month}
                    onClick={() => { selectMonth(pickerYear, month); setExpandedSection(null); setShowMoreDrawer(false); }}
                    className={`h-10 rounded-full text-sm font-mono transition-[color,background-color,transform] duration-fast active:scale-95 ${
                      isSelected
                        ? "bg-accent-fill/15 text-accent border border-accent-fill/30 font-semibold"
                        : "text-ink/40 hover:text-ink/80"
                    }`}
                  >{name}</button>
                );
              })}
            </div>
          </div>
        </Collapse>

        {/* Currency row + inline list */}
        <button
          onClick={() => setExpandedSection(s => s === "currency" ? null : "currency")}
          aria-expanded={expandedSection === "currency"}
          className="w-full flex items-center justify-between px-4 py-4 text-body text-ink hover:bg-ink/7 transition-colors"
        >
          <span className="text-ink/60">Currency</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold">{currency}</span>
            <ChevronDown size={13} className={`text-ink/40 transition-transform duration-200 ${expandedSection === "currency" ? "rotate-180" : ""}`} />
          </div>
        </button>
        <Collapse open={expandedSection === "currency"}>
          <div className="overflow-y-auto max-h-64">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                onClick={() => { selectCurrency(c.code); setExpandedSection(null); }}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-[color,background-color,transform] duration-fast active:scale-[0.98] ${
                  currency === c.code ? "text-accent bg-accent-fill/10" : "text-ink hover:bg-ink/7"
                }`}
              >
                <span className="font-mono font-semibold text-base">{c.code}</span>
                <span className="text-sm text-ink/50">{c.name}</span>
              </button>
            ))}
          </div>
        </Collapse>

        {/* Insights */}
        <button
          onClick={() => { setShowMoreDrawer(false); changeView("insights"); }}
          className="w-full flex items-center justify-between px-4 py-4 text-body text-ink hover:bg-ink/7 transition-colors"
        >
          <span className="text-ink/60">Insights</span>
          <Lightbulb size={14} className="text-ink/40" />
        </button>

        {/* Currency converter */}
        <button
          onClick={() => { setShowMoreDrawer(false); setShowConverterDrawer(true); }}
          className="w-full flex items-center justify-between px-4 py-4 text-body text-ink hover:bg-ink/7 transition-colors"
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
          className="w-full flex items-center justify-between px-4 py-4 text-body text-ink hover:bg-ink/7 transition-colors"
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
            className="w-full flex items-center justify-between px-4 py-4 text-body text-ink hover:bg-ink/7 transition-colors"
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
            className="w-full flex items-center justify-between px-4 py-4 text-body text-ink hover:bg-ink/7 transition-colors"
          >
            <span className="text-ink/60">Billing reminders</span>
            <span className={`font-mono text-xs font-semibold ${billingReminders ? "text-accent" : "text-ink/40"}`}>
              {billingReminders ? "ON" : "OFF"}
            </span>
          </button>
        )}
        {/* Sign out */}
        <button
          onClick={() => { handleSignOut(); setShowMoreDrawer(false); }}
          className="w-full flex items-center justify-between px-4 py-4 text-body text-danger hover:bg-ink/7 transition-colors"
        >
          <span>Sign out</span>
          <LogOut size={14} />
        </button>
      </BottomDrawer>

      {/* Floating "+ Add" — mobile only, sits above the bottom nav.
          Accent fill rather than glass: Apple asks to limit Liquid Glass to
          navigation chrome so the primary action stays the thing that pops. */}
      {/* Kept mounted and scaled out rather than unmounted, so leaving the
          expenses view doesn't blink it out of existence. */}
      <div
        className={`sm:hidden fixed right-4 z-nav transition-[transform,opacity] duration-slow ease-spring ${
          view === "expenses"
            ? "scale-100 opacity-100"
            : "scale-75 opacity-0 pointer-events-none"
        }`}
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.25rem)" }}
        aria-hidden={view !== "expenses"}
      >
        <button
          onClick={() => { hapticTap(); setShowAddSheet(true); }}
          aria-label="Add expense"
          tabIndex={view === "expenses" ? 0 : -1}
          className="h-12 pl-4 pr-5 flex items-center gap-1.5 rounded-full bg-accent-fill text-accent-on font-semibold text-sm shadow-lg shadow-black/20 active:scale-95 transition-transform duration-fast"
        >
          <Plus size={18} strokeWidth={2.5} />
          Add
        </button>
      </div>

      {/* Add-expense sheet — the mobile counterpart of the desktop inline form */}
      <BottomDrawer open={showAddSheet} onClose={() => setShowAddSheet(false)} title="Add Expense">
        {user && (
          <AddExpenseForm
            bare
            userId={user.id}
            currency={currency}
            onExpenseAdded={() => { fetchExpenses(); setShowAddSheet(false); }}
          />
        )}
      </BottomDrawer>

      {/* Bottom nav — mobile only */}
      <nav aria-label="Primary" className="sm:hidden fixed bottom-0 left-0 right-0 z-nav px-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.25rem)' }}>
        <SegmentedControl<View>
          items={NAV_ITEMS}
          value={view}
          onChange={changeView}
          role={null}
          itemRole={null}
          className="flex items-center h-16 p-1.5 rounded-3xl border glass-chip"
          itemClassName="flex-1 h-full flex flex-col items-center justify-center gap-1 rounded-full text-xs font-mono"
          pillClassName="glass-chip-active border rounded-full"
          activeClassName="text-ink"
          inactiveClassName="text-ink/55 hover:text-ink/80"
        />
      </nav>

      <div className="max-w-2xl mx-auto px-4 pb-36 sm:pb-24 flex flex-col gap-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>

        {/* Header */}
        <header
          className="flex flex-col gap-5 sticky sm:static z-content"
          style={{ top: "env(safe-area-inset-top)" }}
        >
          {/* Row 1: Logo + Sign out */}
          <div className="flex items-center justify-between pt-1 pb-2">
            <Logo className="h-5 w-auto" />
            {/* One shared glass background rather than four floating ones:
                Apple groups toolbar items and warns against layering separate
                Liquid Glass elements, and combining the effect also means one
                backdrop-filter pass instead of four. Inner buttons are 44px to
                clear the minimum touch target; radii stay concentric (26 outer
                - 4 padding = 22 inner). */}
            <div className="flex items-center gap-0.5 p-1 h-control rounded-full border glass-chip">
              <button
                onClick={togglePrivacy}
                aria-label={privacyMode ? "Show amounts" : "Hide amounts"}
                className={`w-11 h-11 flex items-center justify-center rounded-full transition-[color,background-color,border-color,transform] duration-fast active:scale-90 ${
                  privacyMode
                    ? "bg-accent-fill/15 text-accent"
                    : "text-ink/55 hover:text-ink/90"
                }`}
              >
                {privacyMode ? <EyeClosed size={16} /> : <Eye size={16} />}
              </button>
              <button
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
                }}
                aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                className="w-11 h-11 flex items-center justify-center rounded-full text-ink/55 hover:text-ink/90 transition-[color,background-color,border-color,transform] duration-fast active:scale-90"
              >
                {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              </button>
              <button
                onClick={() => setShowMoreDrawer(true)}
                aria-label="Menu"
                className="sm:hidden w-11 h-11 flex items-center justify-center rounded-full text-ink/55 hover:text-ink/90 transition-[color,background-color,border-color,transform] duration-fast active:scale-90"
              >
                <MoreHorizontal size={16} />
              </button>
              <button
                onClick={() => handleSignOut()}
                aria-label="Sign out"
                className="hidden sm:flex w-11 h-11 items-center justify-center rounded-full text-ink/55 hover:text-ink/90 transition-[color,background-color,border-color,transform] duration-fast active:scale-90"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>

          {/* Row 2 (desktop): Currency + Export + Month nav */}
          <div className="hidden sm:flex items-center gap-2 w-full justify-between">
            {/* Currency picker */}
            <div ref={currencyRef} className="relative">
              <button
                onClick={() => setShowCurrencyPicker((v) => !v)}
                className="flex items-center gap-1 h-10 px-3 rounded-full border flat-chip text-ink/40 hover:text-ink/90 transition-[color,background-color,border-color,transform] duration-fast active:scale-95 text-xs font-mono"
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
                className="flex items-center gap-1.5 h-10 px-3 rounded-full border flat-chip text-ink/40 hover:text-ink/90 transition-[color,background-color,border-color,transform] duration-fast active:scale-95 text-xs font-mono"
              >
                <Download size={12} />
                CSV
              </button>
              <button
                onClick={() => setShowConverterDrawer(true)}
                aria-label="Convert currency"
                className="w-10 h-10 flex items-center justify-center rounded-full border flat-chip text-ink/40 hover:text-ink/90 transition-[color,background-color,border-color,transform] duration-fast active:scale-90"
              >
                <ArrowsLeftRight size={14} />
              </button>
              <button
                onClick={prevMonth}
                aria-label="Previous month"
                className="w-10 h-10 flex items-center justify-center rounded-full border flat-chip text-ink/40 hover:text-ink/90 transition-[color,background-color,border-color,transform] duration-fast active:scale-90"
              >
                ‹
              </button>
              <span className="font-sans text-body text-ink font-medium min-w-[72px] text-center overflow-hidden">
                <ViewTransition
                  trigger={`${selectedMonth.year}-${selectedMonth.month}`}
                  direction={monthDir}
                  className="block"
                >
                  {MONTH_NAMES[selectedMonth.month - 1]} {selectedMonth.year}
                </ViewTransition>
              </span>
              <button
                onClick={nextMonth}
                aria-label="Next month"
                className="w-10 h-10 flex items-center justify-center rounded-full border flat-chip text-ink/40 hover:text-ink/90 transition-[color,background-color,border-color,transform] duration-fast active:scale-90"
              >
                ›
              </button>
            </div>
          </div>
          {/* Row 3: View toggle (full width) — desktop only */}
          <SegmentedControl<View>
            items={SECTION_ITEMS}
            value={view}
            onChange={changeView}
            ariaLabel="Sections"
            className="hidden sm:flex items-center h-10 p-0.5 rounded-full border flat-chip w-full"
            itemClassName="flex-1 h-9 rounded-full text-sm font-mono"
            pillClassName="flat-chip-active border rounded-full"
            activeClassName="text-ink"
            inactiveClassName="text-ink/40 hover:text-ink/80"
          />
        </header>

        {/* Hero + section content move together, so a section change reads as
            one thing sliding rather than four independent swaps. Only the
            section keys this — the month is handled further in, so the hero
            totals can count to their new value instead of remounting. */}
        <ViewTransition trigger={view} direction={viewDir} className="flex flex-col gap-4">
          {/* Stats */}
          {view === "expenses" && (
            <StatsBar expenses={expenses} selectedMonth={selectedMonth} currency={currency} subscriptionsTotal={subscriptionsTotal} />
          )}
          {view === "subscriptions" && (
            <div className="flex flex-col gap-2">
              <div className="px-1 pt-2 pb-5 flex flex-col gap-1">
                <span className="font-sans text-xs text-muted font-semibold leading-none">Monthly Bills</span>
                <AnimatedNumber
                  value={subscriptionsTotal}
                  format={(v) => formatAmount(v, currency)}
                  className="font-mono text-5xl font-bold text-ink leading-tight"
                />
              </div>
              <GlassSurface borderRadius={28}>
                <div className="w-full grid grid-cols-2 divide-x divide-ink/7">
                  <div className="px-5 py-4 flex flex-col gap-1">
                    <span className="font-sans text-xs text-muted font-semibold leading-none">Active</span>
                    <span className="font-mono text-2xl font-bold text-ink leading-tight">{privacyMode ? "•" : subscriptions.length}</span>
                  </div>
                  <div className="px-5 py-4 flex flex-col gap-1">
                    <span className="font-sans text-xs text-muted font-semibold leading-none">Per Year</span>
                    <AnimatedNumber
                      value={subscriptionsTotal * 12}
                      format={(v) => formatAmount(v, currency)}
                      className="font-mono text-2xl font-bold text-ink leading-tight"
                    />
                  </div>
                </div>
              </GlassSurface>
            </div>
          )}
          {view === "income" && (
            <div className="px-1 pt-2 pb-5 flex flex-col gap-1">
              <span className="font-sans text-xs text-muted font-semibold leading-none">Monthly Income</span>
              <AnimatedNumber
                value={incomeTotalHero}
                format={(v) => formatAmount(v, currency)}
                className="font-mono text-5xl font-bold text-ink leading-tight"
              />
            </div>
          )}

          {view === "expenses" ? (
            <>
              {/* Add form — desktop only. Mobile uses the floating "+ Add"
                  button above the bottom nav, which opens the same form in a sheet.
                  Deliberately outside the month transition below: changing month
                  should not wipe a half-typed expense. */}
              {!isMobile && (
                <AddExpenseForm userId={user.id} currency={currency} onExpenseAdded={fetchExpenses} />
              )}

              {/* Budget */}
              <BudgetBar spent={expensesTotal + subscriptionsTotal} currency={currency} budget={budget} onBudgetSave={saveBudget} />

              {/* Filter tabs */}
              <SegmentedControl<Filter>
                items={FILTER_ITEMS}
                value={filter}
                onChange={setFilter}
                ariaLabel="Filter expenses"
                className="flex gap-2"
                itemClassName="flex-1 h-10 rounded-full text-sm font-semibold border transition-colors"
                pillClassName="flat-chip-active border-2 rounded-full"
                activeClassName="text-accent border-transparent"
                inactiveClassName="flat-chip text-ink/60 hover:text-ink"
              />

              {/* Expense list / loading / error. Keyed on filter and month so
                  both replay the enter animation; the month supplies direction. */}
              <ViewTransition
                trigger={`${filter}|${selectedMonth.year}-${selectedMonth.month}`}
                direction={monthDir}
              >
                {fetchError ? (
                  <div className="bg-ink/7 rounded-xl border border-danger-fill/40 p-5 text-center">
                    <p className="text-danger font-mono text-sm">{fetchError}</p>
                    <button onClick={fetchExpenses} className="mt-3 text-xs font-mono text-muted underline hover:text-ink">
                      Retry
                    </button>
                  </div>
                ) : loading ? (
                  <LoadingSkeleton />
                ) : (
                  // Keyed so the real list fades in over the skeleton instead
                  // of replacing it between two frames.
                  <div key="list" className="animate-fade-slide-in">
                    <ExpenseList
                      expenses={filteredExpenses}
                      onDeleted={fetchExpenses}
                      onUpdated={fetchExpenses}
                      currency={currency}
                    />
                  </div>
                )}
              </ViewTransition>

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
        </ViewTransition>
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
            <div className="h-3 w-16 bg-ink/7 rounded" />
            <div className="h-3 w-20 bg-ink/7 rounded" />
          </div>
          <div className="bg-ink/4 rounded-xl border border-ink/7 overflow-hidden divide-y divide-ink/8">
            {[0, 1, 2].map((r) => (
              <div key={r} className="flex items-center gap-3 px-4 py-3">
                <div className="w-2.5 h-2.5 rounded-full bg-ink/7 flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-3 w-2/3 bg-ink/7 rounded" />
                  <div className="h-2.5 w-1/4 bg-ink/7 rounded-full" />
                </div>
                <div className="h-3 w-20 bg-ink/7 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
