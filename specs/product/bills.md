# Bills

Status: Accepted · Code: `lib/bills.ts`, `lib/supabase.ts` (`getSubscriptionsForMonth`, `addSubscription`, `updateSubscription`, `deleteSubscription`) · Tests: `tests/bills.test.ts`

## Why
A bill is a promise about the future, not a rewrite of the past. Raising the
rent in September must not change what August cost.

## Rules
- A bill row is one *version* of a bill, valid from `start_month` to
  `end_month` (null = ongoing). Both are `YYYY-MM`, so they compare as strings.
- **Adding** a bill while viewing a month starts it in that month.
- **Editing** a bill that started earlier closes the old row at the month
  before and opens a new one from the viewed month, inheriting the old
  `end_month` so a later version isn't overlapped.
- **Deleting** a bill that started earlier sets its `end_month` to the month
  before.
- A row that started in the viewed month, or has no period at all, is edited or
  deleted outright — there is no earlier month to protect.
- A row with no period is always shown. Losing sight of a bill is worse than
  showing it early.
- Components never write the period themselves; only the four functions above
  do.
- `billing_day` exists in the database but is hidden from the UI (always 1).
- The month's bill total is added to the month total and to the budget's
  `spent`.

## Acceptance criteria
- **BILL-1** Given a bill added while viewing Sep 2026, then it shows in Sep
  2026 and every month after, and not in Aug 2026.
- **BILL-2** Given a bill ending Jun 2026, then it shows in June and not July.
- **BILL-3** Given a period crossing a year boundary, then months compare
  chronologically.
- **BILL-4** Given a row with no period, then it is shown in every month.
- **BILL-5** Given a bill that started in March, when it is edited or deleted
  in September, then the change is a split: March–August are untouched.
- **BILL-6** Given a bill that started in the viewed month, when it is edited
  or deleted, then the row is changed in place.
