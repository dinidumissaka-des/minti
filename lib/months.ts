export const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const MONTH_NAMES_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthLabel(year: number, month: number) {
  return `${MONTH_NAMES_SHORT[month - 1]} ${year}`;
}

/** 'YYYY-MM' — the key subscriptions are scoped by. Sorts chronologically. */
export function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function prevMonthKey(year: number, month: number) {
  return month === 1 ? monthKey(year - 1, 12) : monthKey(year, month - 1);
}
