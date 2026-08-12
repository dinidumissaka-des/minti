import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import type { Expense, Subscription } from "@/types";
import { isNative } from "@/lib/platform";

async function downloadCSV(content: string, filename: string) {
  if (isNative()) {
    const { uri } = await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title: filename, url: uri });
    return;
  }

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCell(value: string | number): string {
  const str = String(value);
  return str.includes(",") || str.includes('"') || str.includes("\n")
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export async function exportExpensesCSV(
  expenses: Expense[],
  currency: string,
  month: { year: number; month: number }
) {
  const rows = [
    ["Date", "Time", "Description", "Category", `Amount (${currency})`],
    ...expenses
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((e) => [e.date, e.time ?? "", e.description, e.category, e.amount]),
  ];
  const csv = rows.map((r) => r.map(escapeCell).join(",")).join("\n");
  const label = `${MONTH_NAMES[month.month - 1]}-${month.year}`;
  await downloadCSV(csv, `minti-expenses-${label}.csv`);
}

export async function exportSubscriptionsCSV(subscriptions: Subscription[], currency: string) {
  const rows = [
    ["Name", "Category", `Amount/Month (${currency})`],
    ...subscriptions.map((s) => [s.name, s.category, s.amount]),
  ];
  const csv = rows.map((r) => r.map(escapeCell).join(",")).join("\n");
  await downloadCSV(csv, "minti-subscriptions.csv");
}
