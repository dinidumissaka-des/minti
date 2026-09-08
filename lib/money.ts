import { formatAmount } from "@/lib/currencies";

// Rates as the provider gives them: units of `code` per 1 unit of the base the
// map was fetched for. That base is always the display currency here, so an
// entry recorded in `code` is divided by its rate, not multiplied.
export type Rates = Record<string, number>;

// What an entry was actually recorded in, kept beside the converted figure so
// a row can show both. Client-side only — never written back.
export type Original = { amount: number; currency: string };

export type Priced = { amount: number; currency?: string | null; original?: Original };

export type Money = {
  /** What every figure on screen is counted in. */
  display: string;
  /** What an entry saved before currencies existed is in. */
  base: string;
  currencyOf: (row: { currency?: string | null }) => string;
  canConvert: (from: string) => boolean;
  convert: (amount: number, from?: string | null) => number;
  format: (amount: number, from?: string | null) => string;
};

export function makeMoney(display: string, base: string, rates: Rates | null): Money {
  const currencyOf = (row: { currency?: string | null }) => row.currency || base;

  // Null rather than 1 when the rate is unknown: a missing rate has to be
  // visible to the caller, because silently counting 40 EUR as 40 AED is the
  // bug this whole layer exists to fix.
  function rateFor(from: string): number | null {
    if (from === display) return 1;
    const perDisplay = rates?.[from];
    if (!perDisplay) return null;
    return 1 / perDisplay;
  }

  const convert = (amount: number, from?: string | null) => {
    const rate = rateFor(from || base);
    return rate === null ? Number(amount) : Number(amount) * rate;
  };

  return {
    display,
    base,
    currencyOf,
    canConvert: (from: string) => rateFor(from) !== null,
    convert,
    format: (amount, from) => formatAmount(convert(amount, from), display),
  };
}

// Converts a fetched page of rows once, at the boundary, so every total and
// figure downstream keeps summing a single currency. The row's own amount is
// replaced by the converted one and the entered figure moves to `original`,
// which is set only when the two differ.
export function toDisplay<T extends Priced>(rows: T[], money: Money): T[] {
  return rows.map((row) => {
    const from = money.currencyOf(row);
    const amount = Number(row.amount);
    if (from === money.display) return { ...row, amount, original: undefined };
    return { ...row, amount: money.convert(amount, from), original: { amount, currency: from } };
  });
}

// A row shown as entered because no rate reached us. Worth saying out loud —
// the figure is in the wrong currency and every total containing it is off.
export function hasUnconverted(rows: Priced[], money: Money): boolean {
  return rows.some((row) => !money.canConvert(money.currencyOf(row)));
}
