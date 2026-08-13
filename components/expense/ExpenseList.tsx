"use client";

import { useState, useRef } from "react";
import { Trash2, Pencil, Check, X, Loader2 } from "lucide-react";
import { deleteExpense, updateExpense } from "@/lib/supabase";
import { hapticTap, hapticBump } from "@/lib/haptics";
import { formatAmount } from "@/lib/currencies";
import { CATEGORY_COLORS } from "@/lib/categories";
import GlassSurface from "@/components/GlassSurface";
import { usePrivacy } from "@/components/PrivacyContext";
import BottomDrawer from "@/components/BottomDrawer";
import { CalendarPicker, CategoryList } from "@/components/ui/DrawerPickers";
import type { Expense } from "@/types";

const PRESET_CATEGORIES = Object.keys(CATEGORY_COLORS);

function formatDateLabel(dateStr: string) {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AE", { weekday: "long", day: "numeric", month: "short" });
}

interface Props {
  expenses: Expense[];
  onDeleted: () => void;
  onUpdated: () => void;
  currency: string;
}

interface EditState {
  description: string;
  category: string;
  amount: string;
  date: string;
}

const SWIPE_THRESHOLD = 60;
// Matches the collapse transition below; keep the two in step.
const ROW_EXIT_MS = 200;

export default function ExpenseList({ expenses, onDeleted, onUpdated, currency }: Props) {
  const { mask } = usePrivacy();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCatDrawer, setShowCatDrawer] = useState(false);
  const [showDateDrawer, setShowDateDrawer] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchActiveId = useRef<string | null>(null);
  const touchDx = useRef(0);

  function startEdit(expense: Expense) {
    setSwipedId(null);
    setEditingId(expense.id);
    setEditState({
      description: expense.description,
      category: expense.category,
      amount: String(expense.amount),
      date: expense.date,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
  }

  async function handleSave(id: string) {
    if (!editState) return;
    const parsed = parseFloat(editState.amount);
    if (!editState.description.trim() || isNaN(parsed) || parsed <= 0) return;
    setSaving(true);
    try {
      await updateExpense(id, {
        description: editState.description.trim(),
        category: editState.category,
        amount: parsed,
        date: editState.date,
      });
      setEditingId(null);
      setEditState(null);
      onUpdated();
    } finally {
      setSaving(false);
    }
  }

  // The row collapses first, then the request goes out. Deleting used to leave
  // a gap mid-request and then snap everything below upward.
  async function handleDelete(id: string) {
    hapticBump();
    setDeletingId(id);
    setRemovingId(id);
    await new Promise((resolve) => setTimeout(resolve, ROW_EXIT_MS));
    try {
      await deleteExpense(id);
      onDeleted();
    } catch {
      // parent will re-fetch
    } finally {
      setDeletingId(null);
      setRemovingId(null);
    }
  }

  function snapBack(id: string) {
    const el = rowRefs.current[id];
    if (!el) return;
    el.style.transition = "transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1)";
    el.style.transform = "translateX(0)";
    setSwipedId(null);
    touchActiveId.current = null;
    touchDx.current = 0;
  }

  function snapToReveal(id: string) {
    const el = rowRefs.current[id];
    if (!el) return;
    el.style.transition = "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)";
    el.style.transform = "translateX(-88px)";
    setSwipedId(id);
    touchActiveId.current = null;
    touchDx.current = 0;
  }

  function onTouchStart(e: React.TouchEvent, id: string) {
    if (swipedId && swipedId !== id) snapBack(swipedId);
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchActiveId.current = id;
    touchDx.current = 0;
    const el = rowRefs.current[id];
    if (el) el.style.transition = "none";
  }

  function onTouchMove(e: React.TouchEvent, id: string) {
    if (touchActiveId.current !== id) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (dy > 10 && Math.abs(dx) < dy) return; // vertical scroll, ignore
    const clamped = Math.max(-110, Math.min(0, dx));
    if (Math.abs(touchDx.current) < SWIPE_THRESHOLD && Math.abs(clamped) >= SWIPE_THRESHOLD) {
      hapticTap();
    }
    touchDx.current = clamped;
    const el = rowRefs.current[id];
    if (el) el.style.transform = `translateX(${clamped}px)`;
  }

  function onTouchEnd(id: string) {
    const dx = touchDx.current;
    if (dx < -SWIPE_THRESHOLD) {
      hapticBump();
      snapToReveal(id);
    } else {
      snapBack(id);
    }
    touchActiveId.current = null;
    touchDx.current = 0;
  }

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-slide-in">
        <span className="text-4xl mb-3" aria-hidden="true">🪙</span>
        <p className="font-sans font-semibold text-lg text-muted">No expenses yet</p>
        <p className="font-sans text-sm text-muted mt-1">Add one above to get started.</p>
      </div>
    );
  }

  const grouped = expenses.reduce<Record<string, Expense[]>>((acc, e) => {
    (acc[e.date] = acc[e.date] ?? []).push(e);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // Stagger runs across the whole list, not per group, so the cascade reads as
  // one sweep down the page rather than restarting at each date header.
  let rowIndex = -1;

  return (
    <div className="flex flex-col gap-6">
      {sortedDates.map((date) => {
        const dayExpenses = grouped[date];
        const dayTotal = dayExpenses.reduce((s, e) => s + Number(e.amount), 0);

        return (
          <div key={date}>
            <div className="flex items-center gap-3 mb-2 px-1">
              <span className="font-mono text-xs text-muted whitespace-nowrap">
                {formatDateLabel(date)}
              </span>
              <div className="flex-1 h-px bg-ink/5" />
              <span className="font-mono text-xs text-muted whitespace-nowrap">
                {currency} {mask(formatAmount(dayTotal, currency))}
              </span>
            </div>

            <GlassSurface borderRadius={28} backgroundOpacity={0.07}>
            <div className="w-full divide-y divide-ink/10">
              {dayExpenses.map((expense) => {
                const isEditing = editingId === expense.id;
                const isSwiped = swipedId === expense.id;
                rowIndex += 1;
                const enterStyle = { animationDelay: `${Math.min(rowIndex * 35, 280)}ms` };

                if (isEditing && editState) {
                  return (
                    <div key={expense.id} className="px-4 py-3 flex flex-col gap-3 bg-ink/3 animate-row-in">
                      <div className="flex gap-2">
                        <input
                          className="flex-1 bg-ink/7 border border-ink/10 rounded-lg px-3 h-11 text-base text-ink placeholder:text-muted outline-none focus:border-ink/40"
                          value={editState.description}
                          onChange={(e) => setEditState({ ...editState, description: e.target.value })}
                          placeholder="Description"
                          aria-label="Description"
                          autoFocus
                        />
                        <input
                          type="number"
                          className="w-28 bg-ink/7 border border-ink/10 rounded-lg px-3 h-11 text-base text-ink outline-none focus:border-ink/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          value={editState.amount}
                          onChange={(e) => setEditState({ ...editState, amount: e.target.value })}
                          placeholder="Amount"
                          aria-label="Amount"
                          min="0.01"
                          step="0.01"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCatDrawer(true)}
                        className="w-full bg-ink/7 border border-ink/10 rounded-lg px-3 h-11 text-body text-ink text-left hover:border-ink/30 transition-colors"
                      >
                        {editState.category}
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowDateDrawer(true)}
                          className="flex-1 bg-ink/7 border border-ink/10 rounded-lg px-3 h-11 text-body text-ink text-left hover:border-ink/30 transition-colors"
                        >
                          {formatDateLabel(editState.date)}
                        </button>
                        <button
                          onClick={() => handleSave(expense.id)}
                          disabled={saving}
                          aria-label="Save changes"
                          className="w-11 h-11 flex items-center justify-center rounded-lg bg-accent-fill text-accent-on hover:bg-accent-fill/85 disabled:opacity-50 flex-shrink-0"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          aria-label="Cancel editing"
                          className="w-11 h-11 flex items-center justify-center rounded-lg border border-ink/10 text-muted hover:text-ink flex-shrink-0"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={expense.id}
                    className={`grid transition-[grid-template-rows,opacity] duration-base ease-out ${
                      removingId === expense.id ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
                    }`}
                  >
                  <div className="min-h-0 overflow-hidden">
                  <div
                    className="relative overflow-hidden group animate-row-in"
                    style={enterStyle}
                    onClick={() => { if (isSwiped) snapBack(expense.id); }}
                  >
                    {/* Swipe action buttons — hidden until swiped */}
                    <div className={`absolute right-0 top-0 bottom-0 flex items-center gap-1 px-2 sm:hidden transition-opacity duration-200 ${isSwiped ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                      <button
                        onClick={(e) => { e.stopPropagation(); startEdit(expense); }}
                        aria-label="Edit expense"
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-ink/10 text-ink"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(expense.id); }}
                        disabled={deletingId === expense.id}
                        aria-label="Delete expense"
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-danger-fill/20 text-danger disabled:opacity-30"
                      >
                        {deletingId === expense.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>

                    {/* Row */}
                    <div
                      ref={(el) => { rowRefs.current[expense.id] = el; }}
                      onTouchStart={(e) => onTouchStart(e, expense.id)}
                      onTouchMove={(e) => onTouchMove(e, expense.id)}
                      onTouchEnd={() => onTouchEnd(expense.id)}
                      onTouchCancel={() => snapBack(expense.id)}
                      className="group relative flex items-center gap-3 px-4 py-4 sm:hover:bg-ink/5 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-ink/90 text-body font-sans truncate">{expense.description}</p>
                        <span className="inline-block mt-0.5 text-xs font-mono px-1.5 py-0.5 rounded-full bg-ink/10 text-ink/50">
                          {expense.category}
                        </span>
                      </div>

                      {expense.time && (
                        <span className="font-mono text-xs text-muted hidden sm:block flex-shrink-0">
                          {expense.time}
                        </span>
                      )}

                      <span className="font-mono text-sm text-ink flex-shrink-0">
                        {mask(formatAmount(Number(expense.amount), currency))}
                      </span>

                      {/* Desktop hover actions */}
                      <div className="hidden sm:flex gap-1 overflow-hidden w-0 group-hover:w-reveal transition-all duration-200 flex-shrink-0">
                        <button
                          onClick={() => startEdit(expense)}
                          aria-label="Edit expense"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-ink transition-colors flex-shrink-0"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          disabled={deletingId === expense.id}
                          aria-label="Delete expense"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-danger disabled:opacity-30 transition-colors flex-shrink-0"
                        >
                          {deletingId === expense.id ? <span className="text-sm">…</span> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  </div>
                  </div>
                );
              })}
            </div>
            </GlassSurface>
          </div>
        );
      })}

      <BottomDrawer open={showCatDrawer} onClose={() => setShowCatDrawer(false)} title="Category">
        {editState && (
          <CategoryList
            selected={editState.category}
            onSelect={(cat) => { setEditState({ ...editState, category: cat }); setShowCatDrawer(false); }}
          />
        )}
      </BottomDrawer>

      <BottomDrawer open={showDateDrawer} onClose={() => setShowDateDrawer(false)} title="Select Date">
        {editState && (
          <CalendarPicker
            value={editState.date}
            onChange={(d) => setEditState({ ...editState, date: d })}
            onClose={() => setShowDateDrawer(false)}
          />
        )}
      </BottomDrawer>
    </div>
  );
}
