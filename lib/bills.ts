import { monthKey } from "@/lib/months";
import type { Subscription } from "@/types";

type Period = Pick<Subscription, "start_month" | "end_month">;

// A row with no period at all is treated as always active: losing sight of a
// bill is worse than showing it early.
export function isActiveInMonth(sub: Period, key: string): boolean {
  return (!sub.start_month || sub.start_month <= key) && (!sub.end_month || sub.end_month >= key);
}

// A row that started in the viewed month (or carries no start) has no earlier
// month to protect, so it changes in place. Anything older is split.
export function changeMode(sub: Period, from: { year: number; month: number }): "in-place" | "split" {
  return !sub.start_month || sub.start_month >= monthKey(from.year, from.month) ? "in-place" : "split";
}
