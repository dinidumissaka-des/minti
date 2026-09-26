# Deletes and undo

Status: Accepted · Code: `components/expense/ExpenseList.tsx`, `app/page.tsx`

## Why
A swipe is easy to do by accident. Undo has to be real, and a row must never
flash back once it has gone.

## Rules
- A swiped-away expense is hidden immediately — `ExpenseList` reports the id
  up so the parent drops it from every total.
- The row leaves the database only when the 5-second undo window closes.
- `commitDelete` awaits the parent's re-fetch before un-hiding.
- Unmounting flushes a pending delete rather than cancelling it.
- The toast shows the undo window draining as an outline.

## Acceptance criteria
- **DEL-1** Given an expense is swiped away, then it disappears and every total
  drops at once. Verify: manual.
- **DEL-2** Given Undo is tapped within 5 seconds, then the row returns and
  nothing was deleted from the database. Verify: manual.
- **DEL-3** Given the window closes, then the row does not reappear at any
  point during the delete request. Verify: manual — throttle the network.
- **DEL-4** Given the user navigates away inside the window, then the delete
  still happens. Verify: manual.
