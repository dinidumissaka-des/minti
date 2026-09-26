import { describe, expect, it } from "vitest";
import { buildSuggestions } from "@/lib/suggestions";
import type { ExpenseHistoryRow } from "@/types";

const row = (description: string, date: string, amount = 10, category = "Transport"): ExpenseHistoryRow =>
  ({ description, date, amount, category }) as ExpenseHistoryRow;

describe("specs/product/suggestions.md", () => {
  it("SUG-1: a habit across months outranks a burst within one week", () => {
    const rows = [
      row("Taxi", "2026-09-05"), row("Taxi", "2026-09-04"), row("Taxi", "2026-09-03"),
      row("Taxi", "2026-09-02"), row("Taxi", "2026-09-01"),
      row("Metro top-up", "2026-08-01"), row("Metro top-up", "2026-07-01"), row("Metro top-up", "2026-06-01"),
    ];
    expect(buildSuggestions(rows, "AED").map((s) => s.description)).toEqual(["Metro top-up", "Taxi"]);
  });

  it("SUG-2: ties on months break on total count, then recency", () => {
    const rows = [
      row("Coffee", "2026-09-04"), row("Tea", "2026-09-03"),
      row("Lunch", "2026-09-02"), row("Lunch", "2026-09-01"),
    ];
    expect(buildSuggestions(rows, "AED").map((s) => s.description)).toEqual(["Lunch", "Coffee", "Tea"]);
  });

  it("SUG-3: the amount and category come from the newest sighting", () => {
    const rows = [row("Gym", "2026-09-01", 250, "Health"), row("Gym", "2026-08-01", 200, "Other")];
    const [gym] = buildSuggestions(rows, "AED");
    expect(gym.amount).toBe(250);
    expect(gym.category).toBe("Health");
  });

  it("SUG-4: descriptions group case- and whitespace-insensitively", () => {
    const rows = [row("Metro ", "2026-09-01"), row("metro", "2026-08-01")];
    const out = buildSuggestions(rows, "AED");
    expect(out).toHaveLength(1);
    expect(out[0].months).toBe(2);
  });

  it("SUG-5: one-offs still appear so a new account gets suggestions", () => {
    expect(buildSuggestions([row("Cinema", "2026-09-01")], "AED")).toHaveLength(1);
  });
});
