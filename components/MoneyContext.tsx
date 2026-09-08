"use client";

import { createContext, useContext } from "react";
import { DEFAULT_CURRENCY } from "@/lib/currencies";
import { makeMoney, type Money } from "@/lib/money";

// Rows are converted at the boundary in page.tsx, but two sections fetch rows
// of their own — the previous month in AnalyticsView, income entries in
// IncomeSection — and they need the same conversion applied to those.
const MoneyContext = createContext<Money>(makeMoney(DEFAULT_CURRENCY, null));

export function MoneyProvider({ money, children }: { money: Money; children: React.ReactNode }) {
  return <MoneyContext.Provider value={money}>{children}</MoneyContext.Provider>;
}

export function useMoney(): Money {
  return useContext(MoneyContext);
}
