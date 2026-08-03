"use client";

import { useState, useEffect, useRef, memo } from "react";
import { Pencil, Check, X } from "lucide-react";
import { formatAmount } from "@/lib/currencies";
import GlassSurface from "@/components/GlassSurface";
import { usePrivacy } from "@/components/PrivacyContext";

interface Props {
  spent: number;
  currency: string;
  budget: number | null;
  onBudgetSave: (value: number) => void;
}

const BudgetBar = memo(function BudgetBar({ spent, currency, budget, onBudgetSave }: Props) {
  const { mask } = usePrivacy();
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.focus(), 50);
  }, [editing]);

  function openEdit() {
    setInput(budget ? String(budget) : "");
    setEditing(true);
  }

  function save() {
    const parsed = parseFloat(input);
    if (!isNaN(parsed) && parsed > 0) {
      onBudgetSave(parsed);
    }
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
  }

  if (!budget && !editing) {
    return (
      <GlassSurface borderRadius={28} backgroundOpacity={0.07}>
        <button
          onClick={openEdit}
          className="w-full text-left px-4 py-4 text-sm text-muted hover:text-ink transition-colors border border-dashed flat-chip-dashed rounded-xl"
        >
          + Set a monthly budget
        </button>
      </GlassSurface>
    );
  }

  if (editing) {
    return (
      <GlassSurface borderRadius={28} backgroundOpacity={0.07}>
      <div className="px-4 py-4 flex items-center gap-3 w-full">
        <span className="font-mono text-xs text-muted flex-shrink-0">{currency}</span>
        <input
          ref={inputRef}
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          placeholder="0.00"
          aria-label="Monthly budget amount"
          className="flex-1 bg-transparent text-ink text-base outline-none focus-visible:ring-2 focus-visible:ring-accent-fill/50 rounded-lg placeholder:text-muted [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button onClick={save} aria-label="Save budget" className="w-11 h-11 flex items-center justify-center rounded-lg bg-accent-fill text-[#163300] flex-shrink-0">
          <Check size={13} />
        </button>
        <button onClick={cancel} aria-label="Cancel" className="w-11 h-11 flex items-center justify-center rounded-lg border border-ink/[0.1] text-muted hover:text-ink flex-shrink-0">
          <X size={13} />
        </button>
      </div>
      </GlassSurface>
    );
  }

  const percentage = Math.min((spent / budget!) * 100, 100);
  const over = spent > budget!;
  const remaining = budget! - spent;

  return (
    <GlassSurface borderRadius={28} backgroundOpacity={0.07}>
    <div className="px-4 py-4 flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between">
        <span className="font-sans text-xs text-muted uppercase tracking-widest font-semibold">Monthly Budget</span>
        <button onClick={openEdit} aria-label="Edit budget" className="text-muted hover:text-ink transition-colors">
          <Pencil size={12} />
        </button>
      </div>

      <div className="h-1.5 w-full bg-ink/[0.08] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${over ? "bg-danger-fill" : "bg-accent-fill"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className={`font-mono text-sm font-semibold ${over ? "text-danger" : "text-ink"}`}>
          {mask(formatAmount(spent, currency))}
          <span className="text-muted font-normal"> / {mask(formatAmount(budget!, currency))}</span>
        </span>
        <span className={`font-mono text-xs ${over ? "text-danger" : "text-muted"}`}>
          {over
            ? `${mask(formatAmount(spent - budget!, currency))} over`
            : `${mask(formatAmount(remaining, currency))} left`}
        </span>
      </div>
    </div>
    </GlassSurface>
  );
});

export default BudgetBar;
