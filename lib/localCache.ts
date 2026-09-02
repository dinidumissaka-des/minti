const PREFIX = "minti_";

// Survives sign-out: display preferences and public FX rates, nothing derived
// from an account.
const KEEP_ON_SIGN_OUT = new Set([
  "minti_theme",
  "minti_privacy",
  "minti_currency",
  "minti_install_dismissed",
]);
const KEEP_PREFIX = "minti_rates_";

const LAST_USER_KEY = "minti_last_user";

// Every cache of account data is namespaced by user id. Two accounts on one
// browser must never read each other's rows out of the offline fallback.
export const expensesKey = (userId: string, year: number, month: number) =>
  `${PREFIX}expenses_${userId}_${year}_${month}`;
export const subscriptionsKey = (userId: string, year: number, month: number) =>
  `${PREFIX}subscriptions_${userId}_${year}-${String(month).padStart(2, '0')}`;
export const budgetKey = (userId: string) => `${PREFIX}budget_${userId}`;
export const monthlyIncomeKey = (userId: string) => `${PREFIX}monthly_income_${userId}`;

export function rememberUser(userId: string) {
  try { localStorage.setItem(LAST_USER_KEY, userId); } catch { /* private mode */ }
}

// Lets the pre-auth paint read the signed-in user's own cached settings. Null
// after a sign-out, because clearUserData drops it along with the data.
export function lastUserId(): string | null {
  try { return localStorage.getItem(LAST_USER_KEY); } catch { return null; }
}

export function clearUserData() {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      if (KEEP_ON_SIGN_OUT.has(key) || key.startsWith(KEEP_PREFIX)) continue;
      doomed.push(key);
    }
    doomed.forEach((key) => localStorage.removeItem(key));
  } catch { /* private mode */ }
}

// Pre-namespacing keys, left behind in browsers that ran an earlier build. They
// are never read again but still hold the rows, so drop them on first load.
const LEGACY_KEYS = ["minti_subscriptions", "minti_budget", "minti_monthly_income"];
const LEGACY_EXPENSES = /^minti_expenses_\d{4}_\d{1,2}$/;

export function purgeLegacyCache() {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (LEGACY_KEYS.includes(key) || LEGACY_EXPENSES.test(key)) doomed.push(key);
    }
    doomed.forEach((key) => localStorage.removeItem(key));
  } catch { /* private mode */ }
}
