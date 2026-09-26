# Suggestions

Status: Accepted · Code: `lib/suggestions.ts`, `getExpenseHistory` in `lib/supabase.ts` · Tests: `tests/suggestions.test.ts`

## Why
The chips above the add form save typing on the expenses people repeat. What
people repeat is a habit — something that comes back month after month — not
whatever they typed last week.

## Rules
- Suggestions read the whole history (`getExpenseHistory`, newest first, up to
  1000 rows), not the month on screen.
- Descriptions group case- and whitespace-insensitively.
- Rank by **distinct months** a description appears in, then total count, then
  recency.
- The amount and category come from the newest sighting, converted into the
  display currency like every other figure.
- One-offs still fill the row once the repeats run out.
- Display: one labelled row that scrolls horizontally, each chip with its
  category colour dot, 44pt tall.

## Acceptance criteria
- **SUG-1** Given five taxis in one week and a metro top-up in each of three
  months, then the metro top-up ranks first.
- **SUG-2** Given two descriptions in the same number of months, then the one
  logged more often ranks higher; on a further tie, the more recent one.
- **SUG-3** Given a gym fee of 200 last month and 250 this month, then the chip
  offers 250 with this month's category.
- **SUG-4** Given "Metro " and "metro", then they are one suggestion.
- **SUG-5** Given a new account with one expense, then one suggestion shows.
