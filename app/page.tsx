"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronDown, Download, Plus } from "lucide-react";
import { CreditCard, ArrowsClockwise, Wallet, Lightbulb, Eye, EyeClosed, ArrowsLeftRight } from "@phosphor-icons/react";
import type { User } from "@supabase/supabase-js";
import { getExpensesByMonth, getSubscriptionsForMonth, subscriptionsNeedMigration, getUserSettings, upsertUserSettings } from "@/lib/supabase";
import { onAuthStateChange, signOut } from "@/lib/auth";
import type { Expense, Subscription } from "@/types";
import { DEFAULT_CURRENCY, formatAmount } from "@/lib/currencies";
import { MONTH_NAMES_SHORT as MONTH_NAMES } from "@/lib/months";
import { exportExpensesCSV, exportSubscriptionsCSV } from "@/lib/export";
import { expensesKey, subscriptionsKey, budgetKey, monthlyIncomeKey, rememberUser, lastUserId, clearUserData, purgeLegacyCache } from "@/lib/localCache";
import { useIsMobile } from "@/hooks/useIsMobile";
import SegmentedControl, { type Segment } from "@/components/ui/SegmentedControl";
import ViewTransition from "@/components/ui/ViewTransition";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import GradualBlur from "@/components/GradualBlur";
import AddExpenseForm from "@/components/expense/AddExpenseForm";
import Surface from "@/components/Surface";
import Logo from "@/components/Logo";
import AuthForm from "@/components/AuthForm";
import AuthShowcase from "@/components/AuthShowcase";
import StatsBar from "@/components/StatsBar";
import HeroAmount from "@/components/HeroAmount";
import MonthChip from "@/components/MonthChip";
import AccountPage from "@/components/AccountPage";
import CurrencyPage from "@/components/CurrencyPage";
import PushPage from "@/components/ui/PushPage";
import Avatar from "@/components/Avatar";
import { MonthPicker } from "@/components/ui/DrawerPickers";
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

// GradualBlur adds +100 to zIndex for page targets, so this lands the scroll
// edge effect at 5: above scrolling content, below the sticky header (z-content).
// Passing 10 here would put it at 110 and blur the header itself.
const SCROLL_EDGE_Z = -95;

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
  const [subsError, setSubsError] = useState<{ message: string; retry: boolean } | null>(null);
  const [view, setView] = useState<View>("expenses");
  const [viewDir, setViewDir] = useState(1);
  const [monthDir, setMonthDir] = useState(1);
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [budget, setBudget] = useState<number | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState<number | null>(null);
  const [incomeTotalHero, setIncomeTotalHero] = useState(0);
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showConverterDrawer, setShowConverterDrawer] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [pickerYear, setPickerYear] = useState(now.getFullYear());
  const [native, setNative] = useState(false);
  const [biometryAvailable, setBiometryAvailable] = useState(false);
  const [appLock, setAppLock] = useState(false);
  const [billingReminders, setBillingReminders] = useState(false);
  const isMobile = useIsMobile();
  const { privacyMode, togglePrivacy } = usePrivacy();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (showMonthPicker) setPickerYear(selectedMonth.year);
  }, [showMonthPicker]);

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
    const cacheKey = subscriptionsKey(user.id, selectedMonth.year, selectedMonth.month);
    try {
      const data = await getSubscriptionsForMonth(selectedMonth.year, selectedMonth.month);
      setSubscriptions(data);
      // The rows are here but unscoped: every bill shows in every month until
      // the period columns exist, so name the fix rather than leaving the list
      // quietly wrong.
      setSubsError(
        subscriptionsNeedMigration()
          ? { message: "Bills aren’t scoped to the month yet. Apply supabase/migration.sql to the database.", retry: false }
          : null,
      );
      try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch { /* quota exceeded */ }
    } catch (error) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try { setSubscriptions(JSON.parse(cached)); setSubsError(null); return; } catch { /* ignore corrupt cache */ }
      }
      // Say so, and say which failure it was. A failed query used to leave an
      // empty list behind, which is indistinguishable from having no bills —
      // it reads as lost data — and then blamed the network for a request the
      // server had answered.
      setSubscriptions([]);
      const rejected = typeof error === "object" && error !== null && "code" in error;
      setSubsError({
        message: rejected
          ? "Could not load bills — the server rejected the request."
          : "Could not load bills. Check your connection.",
        retry: true,
      });
    }
  }, [user, selectedMonth]);

  useEffect(() => {
    if (!user) return;
    fetchExpenses();
  }, [fetchExpenses, user]);

  useEffect(() => {
    if (user) fetchSubscriptions();
  }, [user, fetchSubscriptions]);

  // Stable identity: StatsBar is memoised, so a fresh arrow each render would
  // re-render the hero on every keystroke elsewhere on the page.
  const stepMonth = useCallback((dir: 1 | -1) => {
    setMonthDir(dir);
    setSelectedMonth(({ year, month }) => {
      const index = year * 12 + (month - 1) + dir;
      return { year: Math.floor(index / 12), month: (index % 12) + 1 };
    });
  }, []);

  const prevMonth = useCallback(() => stepMonth(-1), [stepMonth]);
  const nextMonth = useCallback(() => stepMonth(1), [stepMonth]);
  const openMonthPicker = useCallback(() => setShowMonthPicker(true), []);
  const openCurrencyMenu = useCallback(() => setShowCurrencyMenu(true), []);

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

  const isCurrentMonth =
    selectedMonth.year === now.getFullYear() && selectedMonth.month === now.getMonth() + 1;

  useEffect(() => {
    if (!isNative() || !user || !isCurrentMonth) return;
    syncBillingReminders(subscriptions, currency).catch(() => {});
  }, [user, subscriptions, currency, billingReminders, isCurrentMonth]);

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
    if (!native || !user || !isCurrentMonth) return;
    publishWidgetSnapshot({
      spent: expensesTotal + subscriptionsTotal,
      budget,
      currency,
      month: `${MONTH_NAMES[selectedMonth.month - 1]} ${selectedMonth.year}`,
    }).catch(() => {});
  }, [native, user, expensesTotal, subscriptionsTotal, budget, currency, selectedMonth, isCurrentMonth]);

  if (user === undefined) {
    return (
      <main className="relative z-content min-h-screen flex items-center justify-center">
        <img src="/icon-192.png" alt="" aria-hidden width={96} height={96} className="w-24 h-24" />
        <span className="sr-only">Loading</span>
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
      {/* Month picker — opened by the month chip on each hero */}
      <BottomDrawer
        open={showMonthPicker}
        onClose={() => setShowMonthPicker(false)}
        title="Month"
      >
        <MonthPicker
          year={selectedMonth.year}
          month={selectedMonth.month}
          viewYear={pickerYear}
          onViewYearChange={setPickerYear}
          onSelect={(year, month) => { selectMonth(year, month); setShowMonthPicker(false); }}
        />
      </BottomDrawer>

      {/* Pushed pages portal to <body> at one z-index, so the later of two
          paints on top. CurrencyPage opens from AccountPage as well as from
          the hero, so it is declared after it. */}
      <AccountPage
        open={showAccount}
        onClose={() => setShowAccount(false)}
        user={user}
        currency={currency}
        onCurrencyClick={openCurrencyMenu}
        theme={theme}
        onToggleTheme={toggleTheme}
        native={native}
        biometryAvailable={biometryAvailable}
        appLock={appLock}
        onToggleAppLock={toggleAppLock}
        billingReminders={billingReminders}
        onToggleBillingReminders={toggleBillingReminders}
        onExportCSV={exportCSV}
        onSignOut={() => { handleSignOut(); setShowAccount(false); }}
      />

      <CurrencyPage
        open={showCurrencyMenu}
        onClose={() => setShowCurrencyMenu(false)}
        currency={currency}
        onSelect={selectCurrency}
        onOpenConverter={() => setShowConverterDrawer(true)}
      />

      {/* Opened from the currency page, so it is declared after it — see the
          ordering note above. */}
      <PushPage
        open={showConverterDrawer}
        onClose={() => setShowConverterDrawer(false)}
        title="Convert currency"
        ariaLabel="Convert currency"
      >
        <div className="pt-6">
          <CurrencyConverter defaultFrom={currency} />
        </div>
      </PushPage>

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
          className="flex items-center h-16 p-1.5 rounded-3xl glass-chip"
          itemClassName="flex-1 h-full flex flex-col items-center justify-center gap-1 rounded-full text-xs font-mono"
          pillClassName="glass-chip-active rounded-full"
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
          {/* Row 1: account + privacy. On mobile the avatar takes the corner
              the wordmark had — you are always one tap from your account, the
              way the banking apps this borrows from do it. Desktop keeps the
              wordmark and puts the avatar in the right-hand pill, which is
              where a web app is expected to carry it. */}
          <div className="flex items-center justify-between pt-1 pb-2">
            <button
              onClick={() => { hapticTap(); setShowAccount(true); }}
              aria-label="Account and settings"
              className="sm:hidden rounded-full transition-transform duration-fast active:scale-90"
            >
              {/* 52px, matching the glass pill opposite it — the pill is
                  h-control and cannot shrink without taking the eye's touch
                  target under 44px. */}
              <Avatar user={user} size={52} className="border border-ink/10" />
            </button>
            <Logo className="hidden sm:block h-5 w-auto" />
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
                    ? "bg-accent/15 text-accent"
                    : "text-ink/55 hover:text-ink/90"
                }`}
              >
                {privacyMode ? <EyeClosed size={16} /> : <Eye size={16} />}
              </button>
              {/* Theme is a set-once choice that already follows the OS, so it
                  gave up its permanent header slot. What stays in the header is
                  the one control that has to be instant — hiding amounts — and
                  the way into everything else. */}
              <button
                onClick={() => setShowAccount(true)}
                aria-label="Account and settings"
                className="hidden sm:flex w-11 h-11 items-center justify-center rounded-full text-ink/55 hover:text-ink/90 transition-[color,background-color,border-color,transform] duration-fast active:scale-90"
              >
                <Avatar user={user} size={28} />
              </button>
            </div>
          </div>

          {/* Row 2 (desktop): Currency + Export + Month nav */}
          <div className="hidden sm:flex items-center gap-2 w-full justify-between">
            {/* Currency picker */}
            <div className="relative">
              <button
                onClick={openCurrencyMenu}
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
            activeClassName="text-chip-on"
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
            <StatsBar
              expenses={expenses}
              selectedMonth={selectedMonth}
              currency={currency}
              subscriptionsTotal={subscriptionsTotal}
              onMonthClick={openMonthPicker}
              onMonthStep={stepMonth}
              onCurrencyClick={openCurrencyMenu}
            />
          )}
          {view === "subscriptions" && (
            <div className="flex flex-col gap-2">
              <HeroAmount
                label="Monthly Bills"
                value={subscriptionsTotal}
                currency={currency}
                onCurrencyClick={openCurrencyMenu}
                month={selectedMonth}
                onMonthClick={openMonthPicker}
                onMonthStep={stepMonth}
              />
              <Surface borderRadius={28}>
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
              </Surface>
            </div>
          )}
          {/* Insights has no figure of its own, so the word stands where the
              figure stands on every other view — same size, same centred axis,
              same chip above it. */}
          {view === "insights" && (
            <div className="px-1 pt-2 pb-9 flex flex-col items-center gap-1 text-center">
              <div className="flex items-center justify-center min-h-[2rem] sm:min-h-0">
                <MonthChip year={selectedMonth.year} month={selectedMonth.month} onClick={openMonthPicker} />
              </div>
              <h1 className="font-sans text-5xl font-bold text-ink leading-tight">Insights</h1>
            </div>
          )}
          {view === "income" && (
            <HeroAmount
              label="Monthly Income"
              value={incomeTotalHero}
              currency={currency}
              onCurrencyClick={openCurrencyMenu}
              month={selectedMonth}
              onMonthClick={openMonthPicker}
              onMonthStep={stepMonth}
            />
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

              {/* The list names itself. All / Today / This Week stood here
                  instead: three tabs to cut a month that is already scoped by
                  the chip on the hero, and the list groups by day anyway, so
                  Today was the first group and This Week the first few. */}
              <h2 className="px-1 pt-1 font-sans text-xl font-bold text-ink">Expenses</h2>

              {/* Expense list / loading / error. Keyed on the month so it
                  replays the enter animation, which supplies the direction. */}
              <ViewTransition
                trigger={`${selectedMonth.year}-${selectedMonth.month}`}
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
                      expenses={expenses}
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
              {subsError && (
                <div className="bg-ink/7 rounded-xl border border-danger-fill/40 p-5 text-center">
                  <p className="text-danger font-mono text-sm">{subsError.message}</p>
                  {subsError.retry && (
                    <button onClick={fetchSubscriptions} className="mt-3 text-xs font-mono text-muted underline hover:text-ink">
                      Retry
                    </button>
                  )}
                </div>
              )}
              <SubscriptionList
                subscriptions={subscriptions}
                userId={user.id}
                currency={currency}
                selectedMonth={selectedMonth}
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
              budget={budget}
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
