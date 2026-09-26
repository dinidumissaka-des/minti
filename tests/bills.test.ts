import { describe, expect, it } from "vitest";
import { changeMode, isActiveInMonth } from "@/lib/bills";

describe("specs/product/bills.md", () => {
  it("BILL-1: a bill added in September applies to September and after, never August", () => {
    const sub = { start_month: "2026-09", end_month: null };
    expect(isActiveInMonth(sub, "2026-08")).toBe(false);
    expect(isActiveInMonth(sub, "2026-09")).toBe(true);
    expect(isActiveInMonth(sub, "2027-03")).toBe(true);
  });

  it("BILL-2: a closed bill stops after its end month", () => {
    const sub = { start_month: "2026-01", end_month: "2026-06" };
    expect(isActiveInMonth(sub, "2026-06")).toBe(true);
    expect(isActiveInMonth(sub, "2026-07")).toBe(false);
  });

  it("BILL-3: month keys compare chronologically across a year boundary", () => {
    const sub = { start_month: "2025-12", end_month: "2026-01" };
    expect(isActiveInMonth(sub, "2025-11")).toBe(false);
    expect(isActiveInMonth(sub, "2026-01")).toBe(true);
    expect(isActiveInMonth(sub, "2026-02")).toBe(false);
  });

  it("BILL-4: a bill with no period is never hidden", () => {
    expect(isActiveInMonth({ start_month: "", end_month: null }, "2020-01")).toBe(true);
  });

  it("BILL-5: editing or deleting a bill that started earlier splits it, so the past is not rewritten", () => {
    expect(changeMode({ start_month: "2026-03", end_month: null }, { year: 2026, month: 9 })).toBe("split");
  });

  it("BILL-6: a bill that started in the viewed month is changed in place", () => {
    expect(changeMode({ start_month: "2026-09", end_month: null }, { year: 2026, month: 9 })).toBe("in-place");
    expect(changeMode({ start_month: "", end_month: null }, { year: 2026, month: 9 })).toBe("in-place");
  });
});
