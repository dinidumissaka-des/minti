"use client";

import { useState, useEffect, useRef, memo } from "react";
import { Pencil, Check, X } from "lucide-react";
import { formatAmount } from "@/lib/currencies";
import GlassSurface from "@/components/GlassSurface";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import Meter from "@/components/ui/Meter";
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
      <button
        onClick={openEdit}
        className="w-full text-left px-4 py-4 text-sm text-muted hover:text-ink transition-colors border border-dashed flat-chip-dashed rounded-full"
      >
        + Set a monthly budget
      </button>
    );
  }

  if (editing) {
    return (
      <GlassSurface borderRadius={28}>
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
          className="flex-1 min-w-0 h-11 bg-ink/7 border border-ink/10 rounded-lg px-3 text-ink text-base outline-none focus:border-ink/40 placeholder:text-muted [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button onClick={save} aria-label="Save budget" className="w-11 h-11 flex items-center justify-center rounded-full bg-accent-fill text-accent-on flex-shrink-0">
          <Check size={13} />
        </button>
        <button onClick={cancel} aria-label="Cancel" className="w-11 h-11 flex items-center justify-center rounded-full border border-ink/10 text-muted hover:text-ink flex-shrink-0">
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
    <GlassSurface borderRadius={28}>
    <div className="px-4 py-4 flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between">
        <span className="font-sans text-xs text-muted font-semibold">Monthly Budget</span>
        <button onClick={openEdit} aria-label="Edit budget" className="text-muted hover:text-ink transition-colors">
          <Pencil size={12} />
        </button>
      </div>

      <Meter
        value={percentage}
        className="h-1.5 w-full bg-ink/8"
        barClassName={over ? "bg-danger-fill" : "bg-accent-fill"}
      />

      <div className="flex items-center justify-between">
        <span className={`font-mono text-sm font-semibold ${over ? "text-danger" : "text-ink"}`}>
          <AnimatedNumber value={spent} format={(v) => formatAmount(v, currency)} />
          <span className="text-muted font-normal"> / {mask(formatAmount(budget!, currency))}</span>
        </span>
        <span className={`font-mono text-xs ${over ? "text-danger" : "text-muted"}`}>
          {over ? (
            <AnimatedNumber value={spent - budget!} format={(v) => formatAmount(v, currency)} suffix=" over" />
          ) : (
            <AnimatedNumber value={remaining} format={(v) => formatAmount(v, currency)} suffix=" left" />
          )}
        </span>
      </div>
    </div>
    </GlassSurface>
  );
});

export default BudgetBar;
