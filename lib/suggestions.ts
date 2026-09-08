import { roundAmount } from "@/lib/currencies";
import type { ExpenseHistoryRow } from "@/types";

export const SUGGESTION_LIMIT = 8;

export type Suggestion = {
  key: string;
  description: string;
  category: string;
  amount: number;
  currency: string;
  /** Distinct months this description was logged in. */
  months: number;
  /** Times it was logged in total. */
  count: number;
};

// A habit is something that comes back month after month, so months carry the
// ranking and the raw count only breaks ties. Five taxis in one busy week is a
// week, not a habit, and ranking on the total alone let that week outrank a
// metro top-up bought every month of the year.
//
// Rows arrive newest-first, which is what makes the first sighting of a
// description the most recent one — the amount and category a chip offers come
// from there, so a price that moved is the price the chip fills in.
export function buildSuggestions(
  rows: ExpenseHistoryRow[],
  display: string,
  limit = SUGGESTION_LIMIT,
): Suggestion[] {
  const groups = new Map<string, Suggestion & { seen: number; monthKeys: Set<string> }>();

  rows.forEach((row, index) => {
    const key = row.description.trim().toLowerCase();
    if (!key) return;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.monthKeys.add(row.date.slice(0, 7));
      return;
    }
    groups.set(key, {
      key,
      description: row.description.trim(),
      category: row.category,
      // In the currency on screen, like every other figure: repeating a 5,000
      // LKR lunch while the app counts in AED should offer it as ~61 AED.
      amount: roundAmount(Number(row.amount), display),
      currency: display,
      months: 0,
      count: 1,
      seen: index,
      monthKeys: new Set([row.date.slice(0, 7)]),
    });
  });

  return Array.from(groups.values())
    .map((g) => ({ ...g, months: g.monthKeys.size }))
    .sort((a, b) => b.months - a.months || b.count - a.count || a.seen - b.seen)
    .slice(0, limit)
    // A one-off still sorts in once the repeats run out, so a new account gets
    // a usable row instead of an empty one on its first few expenses.
    .map(({ key, description, category, amount, currency, months, count }) => ({
      key, description, category, amount, currency, months, count,
    }));
}
