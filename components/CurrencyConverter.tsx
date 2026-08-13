"use client";

import { useEffect, useId, useState } from "react";
import { ArrowsLeftRight } from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";
import { CURRENCIES, formatAmount } from "@/lib/currencies";
import { convertAmount, getCachedRateAge } from "@/lib/exchangeRates";
import AnimatedNumber from "@/components/ui/AnimatedNumber";

interface Props {
  defaultFrom: string;
}

function timeAgo(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return `${hours}h ago`;
}

export default function CurrencyConverter({ defaultFrom }: Props) {
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultFrom === "USD" ? "EUR" : "USD");
  const [result, setResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateAge, setRateAge] = useState<number | null>(null);
  const [swapTurns, setSwapTurns] = useState(0);
  const amountId = useId();
  const fromId = useId();
  const toId = useId();

  useEffect(() => {
    const numeric = Number(amount);
    if (!amount || Number.isNaN(numeric)) {
      setResult(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    convertAmount(numeric, from, to)
      .then((converted) => {
        if (cancelled) return;
        setResult(converted);
        setRateAge(getCachedRateAge(from));
      })
      .catch(() => {
        if (cancelled) return;
        setError("Couldn't fetch rates. Check your connection.");
        setResult(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [amount, from, to]);

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/,/g, "");
    if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
    setAmount(raw);
  }

  // Accumulates rather than toggling, so every press turns the icon another
  // half-turn in the same direction instead of rocking back and forth.
  function swap() {
    setSwapTurns((t) => t + 1);
    setFrom(to);
    setTo(from);
  }

  return (
    <div className="px-2 pb-2 space-y-4">
      <div>
        <label htmlFor={amountId} className="block text-xs text-ink/40 mb-1.5 px-1">Amount</label>
        <input
          id={amountId}
          inputMode="decimal"
          value={amount}
          onChange={handleAmountChange}
          placeholder="0"
          className="w-full h-control rounded-xl border border-ink/10 bg-ink/7 px-4 text-lg font-mono text-ink outline-none focus:border-ink/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor={fromId} className="block text-xs text-ink/40 mb-1.5 px-1">From</label>
          <select
            id={fromId}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full h-control rounded-xl border border-ink/10 bg-ink/7 px-3 text-ink font-mono font-semibold outline-none focus:border-ink/40 appearance-none"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code} className="bg-background text-ink">
                {c.code}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={swap}
          aria-label="Swap currencies"
          className="h-control w-control shrink-0 flex items-center justify-center rounded-full border border-ink/10 bg-ink/7 text-ink/60 hover:text-ink hover:border-ink/30 transition-[color,border-color,transform] duration-fast active:scale-90"
        >
          <ArrowsLeftRight
            size={18}
            className="transition-transform duration-slow ease-out"
            style={{ transform: `rotate(${swapTurns * 180}deg)` }}
          />
        </button>

        <div className="flex-1">
          <label htmlFor={toId} className="block text-xs text-ink/40 mb-1.5 px-1">To</label>
          <select
            id={toId}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full h-control rounded-xl border border-ink/10 bg-ink/7 px-3 text-ink font-mono font-semibold outline-none focus:border-ink/40 appearance-none"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code} className="bg-background text-ink">
                {c.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-ink/10 bg-ink/4 px-4 py-5 text-center">
        {loading ? (
          <Loader2 size={22} className="animate-spin text-ink/40 mx-auto" />
        ) : error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : result !== null ? (
          <>
            <p className="font-mono text-3xl font-bold text-ink leading-tight">
              <AnimatedNumber value={result} format={(v) => formatAmount(v, to)} />{" "}
              <span className="text-lg text-ink/50">{to}</span>
            </p>
            {rateAge !== null && (
              <p className="text-xs text-ink/30 mt-2">Rates updated {timeAgo(rateAge)}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-ink/30">Enter an amount</p>
        )}
      </div>
    </div>
  );
}
