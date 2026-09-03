export type Expense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string; // ISO date string YYYY-MM-DD
  time: string; // HH:MM AM/PM
  created_at: string;
};

export type NewExpense = Omit<Expense, 'id' | 'created_at'>;

// One version of a bill, valid for a range of months. `start_month` is the
// first month it applies to and `end_month` the last, null meaning ongoing —
// both 'YYYY-MM', so string comparison is chronological.
export type Subscription = {
  id: string;
  name: string;
  amount: number;
  category: string;
  billing_day: number;
  start_month: string;
  end_month: string | null;
  created_at: string;
};

export type NewSubscription = Omit<Subscription, 'id' | 'created_at' | 'start_month' | 'end_month'>;

export type Income = {
  id: string;
  source: string;
  amount: number;
  date: string; // YYYY-MM-DD
  created_at: string;
};

export type NewIncome = Omit<Income, 'id' | 'created_at'>;
