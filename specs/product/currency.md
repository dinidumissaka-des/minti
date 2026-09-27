# Currency

Status: Accepted · Code: `lib/money.ts`, `hooks/useRates.ts`, `lib/exchangeRates.ts` · Tests: `tests/currency.test.ts`
History: [0001](../changes/0001-one-currency-setting.md)

## Why
Minti's users live in one country and think in another's money — spending in
AED while budgeting in LKR is the normal case, not an edge case. A figure in
the wrong currency is worse than no figure, because nothing on screen says it
is wrong.

## Rules
- **An amount is a number and a currency.** Every expense, bill and income
  entry stores what it was entered in. The budget and monthly income carry
  `budget_currency` / `income_currency` the same way.
- **There is one currency setting: the display currency.** Every figure on
  screen is in it, and only it — a row entered in LKR and viewed in AED shows
  the AED figure alone.
- **Convert once, at the boundary.** `page.tsx` (the month's expenses and
  bills), `AnalyticsView` (previous month) and `IncomeSection` (its entries)
  pass fetched rows through `toDisplay`. Nothing downstream converts again.
- **Edits save in the display currency.** An editor opens on the converted
  amount and re-stamps the row's `currency` on save; a row that reads 61 must
  not open an editor saying 5,000. The chip beside the amount field overrides
  that when the entry really was made in something else.
- **A missing rate is never 1:1.** The amount stays as entered and the page
  shows a notice.
- **An untagged amount is never guessed at.** It is taken to be in the display
  currency. The migration stamps currencies onto old rows; `hasUntagged` shows
  a banner if it hasn't run.
- The month and the currency sit on the hero figure (`HeroAmount`), not in a
  menu — they are what make the number mean anything.

## Acceptance criteria
- **CUR-1** Given a 205 AED expense, when the display currency is LKR, then it
  shows the LKR conversion, never 205 relabelled.
- **CUR-2** Given a converted row, then the entered figure is kept as
  `original` (for the CSV export); given a row already in the display
  currency, then `original` is empty.
- **CUR-3** Given no rate for EUR, when a 40 EUR row is shown, then it stays 40
  and the page says some amounts could not be converted.
- **CUR-4** Given a row with no currency, then it is taken at face value in the
  display currency and the untagged banner shows.
- **CUR-5** Given rows in LKR, USD and AED, when the display currency is AED,
  then every row is converted once and the total is their plain sum.
- **CUR-6** Given an expense of 5,000 LKR viewed in AED, when its editor
  opens, then the amount field reads the AED figure. Verify: manual — edit a
  row entered in another currency.

## Out of scope
Historical exchange rates — every conversion uses today's rate.
