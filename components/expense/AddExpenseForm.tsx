"use client";

import { useState, useRef, FormEvent } from "react";
import { Plus, Loader2, Check } from "lucide-react";
import { addExpense } from "@/lib/supabase";
import { formatAmount } from "@/lib/currencies";
import { useMoney } from "@/components/MoneyContext";
import { usePrivacy } from "@/components/PrivacyContext";
import { hapticTap, hapticSuccess, hapticError } from "@/lib/haptics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Surface from "@/components/Surface";
import BottomDrawer from "@/components/BottomDrawer";
import Collapse from "@/components/ui/Collapse";
import { CalendarPicker, CategoryList, CurrencyList } from "@/components/ui/DrawerPickers";
import { CATEGORY_COLORS, getCategoryColor, OTHER_CATEGORY_COLOR } from "@/lib/categories";
import { useTheme } from "@/components/ThemeContext";
import type { Suggestion } from "@/lib/suggestions";

const PRESET_CATEGORIES = Object.keys(CATEGORY_COLORS);

interface Props {
  userId: string;
  currency: string;
  /** Ranked repeats read across the whole history, built in page.tsx. */
  suggestions?: Suggestion[];
  onExpenseAdded: () => void;
  /** Drop the Surface card when the form already sits on one (a sheet).
      Apple warns against layering Liquid Glass elements on top of each other. */
  bare?: boolean;
}

function formatDateLabel(iso: string) {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (iso === today) return "Today";
  if (iso === yesterday) return "Yesterday";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export default function AddExpenseForm({ userId, currency, suggestions = [], onExpenseAdded, bare = false }: Props) {
  const money = useMoney();
  const { theme } = useTheme();
  const { mask } = usePrivacy();
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(PRESET_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [displayAmount, setDisplayAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [showDateDrawer, setShowDateDrawer] = useState(false);
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false);
  const [showCurrencyDrawer, setShowCurrencyDrawer] = useState(false);
  // Follows the currency on screen unless this entry overrides it. It used to
  // be seeded once from a remembered value, which the form then kept for the
  // rest of its life: mounted while the display said LKR, it went on tagging
  // expenses LKR long after the display was switched back.
  const [entryOverride, setEntryOverride] = useState<string | null>(null);
  const entryCurrency = entryOverride ?? currency;

  function selectEntryCurrency(code: string) {
    setEntryOverride(code === currency ? null : code);
  }

  function applySuggestion(item: Suggestion) {
    hapticTap();
    setDescription(item.description);
    setCategory(PRESET_CATEGORIES.includes(item.category) ? item.category : "__custom__");
    if (!PRESET_CATEGORIES.includes(item.category)) setCustomCategory(item.category);
    selectEntryCurrency(item.currency);
    const raw = String(item.amount);
    setAmount(raw);
    const parts = raw.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    setDisplayAmount(parts.join("."));
  }

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/,/g, "");
    if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
    setAmount(raw);
    const parts = raw.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    setDisplayAmount(parts.join("."));
  }

  const isCustom = category === "__custom__";
  const effectiveCategory = isCustom ? customCategory.trim() : category;

  const parsedAmount = parseFloat(amount);
  const showsConversion =
    entryCurrency !== money.display && parsedAmount > 0 && money.canConvert(entryCurrency);

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!description.trim() || !effectiveCategory || !amount) {
      setError("Please fill in all fields.");
      return;
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const now = new Date();
      const hours = now.getHours();
      const mins = String(now.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      const h12 = String(hours % 12 || 12);
      const time = `${h12}:${mins} ${ampm}`;
      await addExpense({ description: description.trim(), category: effectiveCategory, amount: parsed, currency: entryCurrency, date, time }, userId);
      setDescription(""); setCategory(PRESET_CATEGORIES[0]); setCustomCategory("");
      setAmount(""); setDisplayAmount(""); setDate(new Date().toISOString().split("T")[0]);
      setEntryOverride(null);
      setSuccess(true);
      hapticSuccess();
      setTimeout(() => setSuccess(false), 2000);
      onExpenseAdded();
    } catch {
      setError("Failed to add expense. Please try again.");
      hapticError();
    } finally {
      setSubmitting(false);
    }
  }

  const body = (
    <div className={bare ? "px-4 py-2 flex flex-col gap-5 w-full" : "p-6 flex flex-col gap-5 w-full"}>
          {/* Hero amount */}
          <div className="flex flex-col items-end gap-1 py-4">
            {/* The code was a label; it is the thing you change when the
                expense is in another currency, so it is the control. */}
            <button
              type="button"
              onClick={() => setShowCurrencyDrawer(true)}
              aria-label={`Currency for this expense — currently ${entryCurrency}`}
              className="font-mono text-xs uppercase tracking-widest font-semibold rounded-full px-2 py-1 -mr-2 text-muted hover:text-ink transition-[color,transform] duration-fast active:scale-95"
            >
              {entryCurrency}
            </button>
            <input
              ref={amountRef}
              type="text"
              inputMode="decimal"
              value={displayAmount}
              onChange={handleAmountChange}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="0.00"
              aria-label="Amount"
              className="peer w-full bg-transparent text-right text-6xl font-bold text-ink placeholder:text-ink/25 outline-none border-none focus-visible:outline-none"
            />
            {/* The rule under the amount is the focus indicator: a ring around
                a field with no visible box reads as a pill floating on the card.
                `bg-accent` not `bg-accent-fill` — a hairline has to carry its own
                contrast, and the fill green is 1.6:1 on a light card. */}
            <div className="h-px w-16 bg-ink/10 mt-1 origin-right transition-[transform,background-color] duration-slow ease-out peer-focus-visible:scale-x-150 peer-focus-visible:scale-y-[2] peer-focus-visible:bg-accent" />
            {/* What it lands as in the currency every total is counted in. */}
            <Collapse open={showsConversion}>
              <span className="block pt-1.5 font-mono text-xs text-muted">
                ≈ {formatAmount(money.convert(parsedAmount, entryCurrency), money.display)} {money.display}
              </span>
            </Collapse>
          </div>

          {/* The repeats, ranked by the months they recur in. One row that
              scrolls rather than a wrapping cloud: the card keeps its height
              however many there are, and the order is readable left to right
              instead of being reshuffled by the widths of the labels. The
              bleed runs the row to the card's edge so the last chip is
              visibly cut off, which is what says there is more to scroll. */}
          {suggestions.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink/40">Frequent</span>
              <div className={`overflow-x-auto overscroll-x-contain ${bare ? "-mx-4 px-4" : "-mx-6 px-6"}`}>
                <div className="flex gap-2 w-max pb-0.5">
                  {suggestions.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => applySuggestion(item)}
                      aria-label={`Repeat ${item.description}, ${mask(formatAmount(item.amount, item.currency))} ${item.currency}`}
                      className="shrink-0 h-11 pl-3 pr-3.5 flex items-center gap-2.5 rounded-full border flat-chip text-ink/70 hover:text-ink transition-[color,background-color,border-color,transform] duration-fast active:scale-95"
                    >
                      <span
                        aria-hidden
                        className="shrink-0 w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: getCategoryColor(item.category, theme) ?? OTHER_CATEGORY_COLOR[theme] }}
                      />
                      <span className="text-sm font-medium truncate max-w-[10rem]">{item.description}</span>
                      <span className="font-mono text-xs text-ink/45">{mask(formatAmount(item.amount, item.currency))}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && amountRef.current?.focus()}
            placeholder="Lunch at Nando's"
            aria-label="Description"
          />

          {/* Category + Date row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowCategoryDrawer(true)}
              className="h-control flex items-center justify-center px-4 rounded-full border border-ink/10 bg-ink/5 hover:border-ink/25 hover:bg-ink/10 transition-colors"
            >
              <span className="font-medium text-sm text-ink truncate">
                {isCustom ? (customCategory.trim() || "Custom") : category}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowDateDrawer(true)}
              className="h-control flex items-center justify-center px-4 rounded-full border border-ink/10 bg-ink/5 hover:border-ink/25 hover:bg-ink/10 transition-colors"
            >
              <span className="font-medium text-sm text-ink">{formatDateLabel(date)}</span>
            </button>
          </div>

          {isCustom && (
            <Input
              type="text"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="Enter category name"
              aria-label="Custom category name"
              autoFocus
            />
          )}

          <Collapse open={!!error}>
            <p className="text-danger text-sm">{error}</p>
          </Collapse>

          {/* Confirmation happens inside the button rather than as a line of
              text above it — no layout shift, and the control you pressed is
              the thing that answers. */}
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className={`w-full flex items-center justify-center gap-2 ${success ? "pointer-events-none" : ""}`}
          >
            {submitting ? (
              <Loader2 size={17} className="animate-spin" />
            ) : success ? (
              <Check size={17} strokeWidth={2.5} className="animate-pop-in" />
            ) : (
              <Plus size={17} strokeWidth={2.5} />
            )}
            <span>{submitting ? "Adding…" : success ? "Added" : "Add Expense"}</span>
          </Button>
    </div>
  );

  return (
    <>
      {bare ? body : (
        <Surface borderRadius={28}>
          {body}
        </Surface>
      )}

      {/* Date bottom drawer */}
      <BottomDrawer open={showDateDrawer} onClose={() => setShowDateDrawer(false)} title="Select Date">
        <CalendarPicker value={date} onChange={setDate} onClose={() => setShowDateDrawer(false)} />
      </BottomDrawer>

      {/* Currency bottom drawer */}
      <BottomDrawer open={showCurrencyDrawer} onClose={() => setShowCurrencyDrawer(false)} title="Currency">
        <CurrencyList
          selected={entryCurrency}
          onSelect={(code) => { selectEntryCurrency(code); setShowCurrencyDrawer(false); }}
        />
      </BottomDrawer>

      {/* Category bottom drawer */}
      <BottomDrawer open={showCategoryDrawer} onClose={() => setShowCategoryDrawer(false)} title="Category">
        <CategoryList
          selected={category}
          onSelect={(cat) => { setCategory(cat); setShowCategoryDrawer(false); }}
          extraOptions={[{ value: "__custom__", label: "Custom…" }]}
        />
      </BottomDrawer>
    </>
  );
}
