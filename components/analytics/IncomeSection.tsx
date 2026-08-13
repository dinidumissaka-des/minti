"use client";

import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { Plus, Trash2, Check, X, Pencil, Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { Expense, Subscription, Income } from "@/types";
import { getIncomeByMonth, addIncome, deleteIncome, upsertUserSettings } from "@/lib/supabase";
import { hapticBump } from "@/lib/haptics";
import { formatAmount } from "@/lib/currencies";
import GlassSurface from "@/components/GlassSurface";
import { usePrivacy } from "@/components/PrivacyContext";
import BottomDrawer from "@/components/BottomDrawer";
import Collapse from "@/components/ui/Collapse";
import Meter from "@/components/ui/Meter";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { CalendarPicker, SourceList } from "@/components/ui/DrawerPickers";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

const INCOME_SOURCES = ["Salary", "Freelance", "Business", "Investment", "Rental", "Gift", "Other"];
// Matches the row collapse transition below; keep the two in step.
const ROW_EXIT_MS = 200;

interface Props {
  user: User;
  selectedMonth: { year: number; month: number };
  currency: string;
  monthlyIncome: number | null;
  onMonthlyIncomeChange: (v: number | null) => void;
  expenses: Expense[];
  subscriptions: Subscription[];
  onTotalChange?: (total: number) => void;
}

const IncomeSection = memo(function IncomeSection({
  user,
  selectedMonth,
  currency,
  monthlyIncome,
  onMonthlyIncomeChange,
  expenses,
  subscriptions,
  onTotalChange,
}: Props) {
  const [incomeEntries, setIncomeEntries] = useState<Income[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [editingBaseline, setEditingBaseline] = useState(false);
  const [baselineInput, setBaselineInput] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSource, setNewSource] = useState("Salary");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState(todayISO());
  const [showSourceDrawer, setShowSourceDrawer] = useState(false);
  const [showDateDrawer, setShowDateDrawer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [swipedIncomeId, setSwipedIncomeId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const baselineRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const incomeTouchStartX = useRef(0);
  const incomeTouchStartY = useRef(0);

  useEffect(() => {
    if (editingBaseline) setTimeout(() => baselineRef.current?.focus(), 50);
  }, [editingBaseline]);

  useEffect(() => {
    if (showAddForm) setTimeout(() => amountRef.current?.focus(), 50);
  }, [showAddForm]);

  function handleIncomeTouchStart(e: React.TouchEvent) {
    incomeTouchStartX.current = e.touches[0].clientX;
    incomeTouchStartY.current = e.touches[0].clientY;
  }

  function handleIncomeTouchEnd(e: React.TouchEvent, entryId: string) {
    const deltaX = incomeTouchStartX.current - e.changedTouches[0].clientX;
    const deltaY = Math.abs(incomeTouchStartY.current - e.changedTouches[0].clientY);
    if (deltaY > 40) return;
    if (deltaX > 50) {
      hapticBump();
      setSwipedIncomeId(entryId);
    } else if (deltaX < -20) {
      setSwipedIncomeId(null);
    }
  }

  const fetchEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const data = await getIncomeByMonth(selectedMonth.year, selectedMonth.month);
      setIncomeEntries(data);
    } catch (err) {
      console.error("Failed to fetch income entries:", err);
    } finally {
      setLoadingEntries(false);
    }
  }, [selectedMonth]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  function openBaselineEdit() {
    setBaselineInput(monthlyIncome ? String(monthlyIncome) : "");
    setEditingBaseline(true);
  }

  function saveBaseline() {
    const v = parseFloat(baselineInput);
    if (!isNaN(v) && v > 0) {
      onMonthlyIncomeChange(v);
      upsertUserSettings({ monthly_income: v }).catch(() => {});
    } else if (baselineInput === "" || baselineInput === "0") {
      onMonthlyIncomeChange(null);
      upsertUserSettings({ monthly_income: null }).catch(() => {});
    }
    setEditingBaseline(false);
  }

  async function handleAddEntry() {
    const parsed = parseFloat(newAmount);
    if (isNaN(parsed) || parsed <= 0 || !newDate) return;
    setSaving(true);
    setSaveError(null);
    try {
      await addIncome({ source: newSource, amount: parsed, date: newDate }, user.id);
      setNewAmount("");
      setNewDate(todayISO());
      setShowAddForm(false);
      fetchEntries();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEntry(id: string) {
    setDeletingId(id);
    setRemovingId(id);
    await new Promise((resolve) => setTimeout(resolve, ROW_EXIT_MS));
    try {
      await deleteIncome(id);
      fetchEntries();
    } catch { /* ignore */ } finally {
      setDeletingId(null);
      setRemovingId(null);
    }
  }

  const entriesTotal = useMemo(
    () => incomeEntries.reduce((s, e) => s + Number(e.amount), 0),
    [incomeEntries],
  );
  const { mask } = usePrivacy();
  const totalIncome = (monthlyIncome ?? 0) + entriesTotal;

  useEffect(() => { onTotalChange?.(totalIncome); }, [totalIncome, onTotalChange]);

  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0)
    + subscriptions.reduce((s, s2) => s + Number(s2.amount), 0);
  const saved = totalIncome - totalSpent;
  const savingsRate = totalIncome > 0 ? (saved / totalIncome) * 100 : null;

  return (
    <div className="flex flex-col gap-3">

      {totalIncome > 0 && (
        <GlassSurface
          borderRadius={28}
          backgroundOpacity={0.07}
          style={
            saved >= 0
              ? { borderColor: "rgb(var(--accent) / 0.25)", boxShadow: "0 0 10px rgb(var(--accent) / 0.05)" }
              : { borderColor: "rgb(var(--danger) / 0.25)" }
          }
        >
          <div className="px-5 py-4 w-full flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-sans text-xs text-muted font-semibold">
                Savings This Month
              </span>
              {savingsRate !== null && (
                <span className={`font-mono text-xs font-semibold ${saved >= 0 ? "text-accent" : "text-danger"}`}>
                  {saved >= 0 ? "+" : ""}{savingsRate.toFixed(0)}%
                </span>
              )}
            </div>
            <div className="flex items-end justify-between">
              <span className={`font-mono text-2xl font-bold ${saved >= 0 ? "text-ink" : "text-danger"}`}>
                <AnimatedNumber
                  value={Math.abs(saved)}
                  format={(v) => formatAmount(v, currency)}
                  prefix={saved >= 0 ? "" : "-"}
                />
                <span className="font-mono text-xs text-muted ml-1">{currency}</span>
              </span>
              <span className="font-mono text-xs text-muted">
                of {mask(formatAmount(totalIncome, currency))} income
              </span>
            </div>
            {savingsRate !== null && (
              <Meter
                value={Math.min(Math.abs(savingsRate), 100)}
                className="h-1.5 w-full bg-ink/8"
                barClassName={saved >= 0 ? "bg-accent-fill" : "bg-danger-fill"}
              />
            )}
          </div>
        </GlassSurface>
      )}

      {editingBaseline || monthlyIncome || entriesTotal > 0 ? (
        <GlassSurface borderRadius={28} backgroundOpacity={0.07}>
          {editingBaseline ? (
            <div className="px-4 py-4 flex items-center gap-3 w-full">
              <span className="font-mono text-xs text-muted flex-shrink-0">{currency}</span>
              <input
                ref={baselineRef}
                type="number"
                value={baselineInput}
                onChange={(e) => setBaselineInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveBaseline(); if (e.key === "Escape") setEditingBaseline(false); }}
                placeholder="Monthly income"
                aria-label="Monthly income"
                className="flex-1 h-10 bg-ink/7 border border-ink/10 rounded-lg px-3 text-ink text-base outline-none focus:border-ink/40 placeholder:text-muted [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button onClick={saveBaseline} aria-label="Save income" className="w-9 h-9 flex items-center justify-center rounded-full bg-accent-fill text-accent-on flex-shrink-0">
                <Check size={13} />
              </button>
              <button onClick={() => setEditingBaseline(false)} aria-label="Cancel" className="w-9 h-9 flex items-center justify-center rounded-full border border-ink/10 text-muted hover:text-ink flex-shrink-0">
                <X size={13} />
              </button>
            </div>
          ) : monthlyIncome ? (
            <div className="px-4 py-4 flex items-center justify-between w-full">
              <div className="flex flex-col gap-0.5">
                <span className="font-sans text-xs text-muted font-semibold">Monthly Income</span>
                <span className="font-mono text-base text-ink font-semibold">
                  {mask(formatAmount(entriesTotal > 0 ? totalIncome : monthlyIncome, currency))}
                  <span className="text-muted text-xs font-normal ml-1">{currency}</span>
                </span>
                {entriesTotal > 0 && (
                  <span className="font-mono text-xs text-muted">
                    {mask(formatAmount(monthlyIncome, currency))} base + {mask(formatAmount(entriesTotal, currency))} one-off
                  </span>
                )}
              </div>
              <button onClick={openBaselineEdit} aria-label="Edit monthly income" className="text-muted hover:text-ink transition-colors">
                <Pencil size={12} />
              </button>
            </div>
          ) : (
            <div className="px-4 py-4 flex items-center justify-between w-full">
              <div className="flex flex-col gap-0.5">
                <span className="font-sans text-xs text-muted font-semibold">Income This Month</span>
                <span className="font-mono text-base text-ink font-semibold">
                  {mask(formatAmount(entriesTotal, currency))}
                  <span className="text-muted text-xs font-normal ml-1">{currency}</span>
                </span>
                <span className="font-mono text-xs text-muted">From one-off entries</span>
              </div>
              <button onClick={openBaselineEdit} aria-label="Set monthly income baseline" className="text-muted hover:text-ink transition-colors text-xs font-mono">
                + baseline
              </button>
            </div>
          )}
        </GlassSurface>
      ) : (
        <button
          onClick={openBaselineEdit}
          className="w-full text-left px-4 py-4 text-sm text-muted hover:text-ink transition-colors border border-dashed flat-chip-dashed rounded-full"
        >
          + Set monthly income baseline
        </button>
      )}

      <GlassSurface borderRadius={28} backgroundOpacity={0.07}>
        <div className="w-full">
          <div className="px-4 py-3 flex items-center justify-between border-b border-ink/7">
            <span className="font-sans text-xs text-muted font-semibold">One-off Income</span>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              aria-label="Add income entry"
              aria-expanded={showAddForm}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-accent-fill text-accent-on transition-transform duration-slow ease-out active:scale-90"
            >
              {/* The same glyph rotated into a close affordance, rather than
                  swapping icons — the control stays one object. */}
              <Plus size={12} className={`transition-transform duration-slow ease-out ${showAddForm ? "rotate-[135deg]" : ""}`} />
            </button>
          </div>

          <Collapse open={showAddForm}>
            <div className="px-4 py-3 flex flex-col gap-2 border-b border-ink/7 bg-ink/3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSourceDrawer(true)}
                  className="flex-1 bg-ink/7 border border-ink/10 rounded-full px-3 h-11 text-body text-ink text-left hover:border-ink/30 transition-colors"
                >
                  {newSource}
                </button>
                <input
                  ref={amountRef}
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddEntry(); if (e.key === "Escape") setShowAddForm(false); }}
                  placeholder="Amount"
                  aria-label="Amount"
                  className="w-28 bg-ink/7 border border-ink/10 rounded-lg px-3 h-11 text-body text-ink outline-none focus:border-ink/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDateDrawer(true)}
                  className="flex-1 bg-ink/7 border border-ink/10 rounded-full px-3 h-11 text-body text-ink text-left hover:border-ink/30 transition-colors"
                >
                  {newDate}
                </button>
                <button
                  onClick={handleAddEntry}
                  disabled={saving}
                  aria-label="Save income entry"
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-accent-fill text-accent-on disabled:opacity-50 flex-shrink-0"
                >
                  <Check size={15} />
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setSaveError(null); }}
                  aria-label="Cancel"
                  className="w-11 h-11 flex items-center justify-center rounded-full border border-ink/10 text-muted hover:text-ink flex-shrink-0"
                >
                  <X size={15} />
                </button>
              </div>
              {saveError && (
                <p className="font-mono text-xs text-danger">{saveError}</p>
              )}
            </div>
          </Collapse>

          {loadingEntries ? (
            <div className="px-4 py-4 text-center">
              <span className="font-mono text-xs text-muted">Loading…</span>
            </div>
          ) : incomeEntries.length === 0 ? (
            <div className="px-4 py-4 text-center">
              <span className="font-mono text-xs text-muted">No one-off income logged</span>
            </div>
          ) : (
            <div className="divide-y divide-ink/7">
              {incomeEntries.map((entry, i) => {
                const isSwiped = swipedIncomeId === entry.id;
                return (
                  <div
                    key={entry.id}
                    className={`grid transition-[grid-template-rows,opacity] duration-base ease-out ${
                      removingId === entry.id ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
                    }`}
                  >
                  <div className="min-h-0 overflow-hidden">
                  <div
                    className="relative overflow-hidden group animate-row-in"
                    style={{ animationDelay: `${Math.min(i * 35, 280)}ms` }}
                    onTouchStart={handleIncomeTouchStart}
                    onTouchEnd={(e) => handleIncomeTouchEnd(e, entry.id)}
                    onClick={() => { if (isSwiped) setSwipedIncomeId(null); }}
                  >
                    <div className={`absolute right-0 top-0 bottom-0 flex items-center px-2 sm:hidden transition-opacity duration-200 ${isSwiped ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteEntry(entry.id); }}
                        disabled={deletingId === entry.id}
                        aria-label="Delete income entry"
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-danger-fill/20 text-danger disabled:opacity-30"
                      >
                        {deletingId === entry.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                    <div
                      className="flex items-center gap-3 px-4 py-3 transition-all duration-200"
                      style={{ transform: isSwiped ? "translateX(-56px)" : "translateX(0)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-sans text-body text-ink truncate">{entry.source}</p>
                        <p className="font-mono text-xs text-muted">{entry.date}</p>
                      </div>
                      <span className="font-mono text-sm text-accent font-semibold flex-shrink-0">
                        +{mask(formatAmount(Number(entry.amount), currency))}
                      </span>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        disabled={deletingId === entry.id}
                        aria-label="Delete income entry"
                        className="w-6 h-6 flex items-center justify-center rounded-full text-muted hover:text-danger opacity-0 group-hover:opacity-100 sm:flex hidden transition-all disabled:opacity-30 flex-shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  </div>
                  </div>
                );
              })}
              {entriesTotal > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-ink/3">
                  <span className="font-sans text-xs text-muted">One-off total</span>
                  <span className="font-mono text-xs text-accent font-semibold">
                    +{mask(formatAmount(entriesTotal, currency))} {currency}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </GlassSurface>

      <BottomDrawer open={showSourceDrawer} onClose={() => setShowSourceDrawer(false)} title="Income Source">
        <SourceList
          sources={INCOME_SOURCES}
          selected={newSource}
          onSelect={(s) => { setNewSource(s); setShowSourceDrawer(false); }}
        />
      </BottomDrawer>

      <BottomDrawer open={showDateDrawer} onClose={() => setShowDateDrawer(false)} title="Select Date">
        <CalendarPicker
          value={newDate}
          onChange={setNewDate}
          onClose={() => setShowDateDrawer(false)}
        />
      </BottomDrawer>
    </div>
  );
});

export default IncomeSection;
