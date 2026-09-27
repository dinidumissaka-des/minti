import { describe, expect, it } from "vitest";
import { hasUnconverted, hasUntagged, makeMoney, toDisplay, type Priced } from "@/lib/money";

// Rates are units of `code` per 1 unit of the display currency.
const LKR_RATES = { AED: 0.0122 };

describe("specs/product/currency.md", () => {
  it("CUR-1: an amount is converted into the display currency, never relabelled", () => {
    const money = makeMoney("LKR", LKR_RATES);
    const [row] = toDisplay([{ amount: 205, currency: "AED" }], money);
    expect(row.amount).toBeCloseTo(205 / 0.0122, 2);
    expect(row.amount).not.toBe(205);
  });

  it("CUR-2: the entered figure is kept as `original` only when a conversion happened", () => {
    const money = makeMoney("LKR", LKR_RATES);
    const rows: Priced[] = [{ amount: 205, currency: "AED" }, { amount: 5000, currency: "LKR" }];
    const [converted, same] = toDisplay(rows, money);
    expect(converted.original).toEqual({ amount: 205, currency: "AED" });
    expect(same.original).toBeUndefined();
  });

  it("CUR-3: a missing rate is never counted as 1:1 — the amount is left as entered and flagged", () => {
    const money = makeMoney("LKR", {});
    const rows = [{ amount: 40, currency: "EUR" }];
    expect(toDisplay(rows, money)[0].amount).toBe(40);
    expect(hasUnconverted(rows, money)).toBe(true);
  });

  it("CUR-4: an untagged amount is taken at face value in the display currency, never divided by a guess", () => {
    const money = makeMoney("LKR", LKR_RATES);
    const rows = [{ amount: 205, currency: null }];
    expect(toDisplay(rows, money)[0].amount).toBe(205);
    expect(hasUntagged(rows)).toBe(true);
  });

  it("CUR-5: every row is converted once, into a single currency, so totals can be summed directly", () => {
    const money = makeMoney("AED", { LKR: 82, USD: 0.2723 });
    const rows = toDisplay(
      [{ amount: 8200, currency: "LKR" }, { amount: 10, currency: "USD" }, { amount: 5, currency: "AED" }],
      money,
    );
    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    expect(total).toBeCloseTo(100 + 10 / 0.2723 + 5, 2);
    expect(hasUnconverted(rows, money)).toBe(false);
  });
});
