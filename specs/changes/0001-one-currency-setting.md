# 0001 — Make the display currency the only currency setting

Status: Shipped
Author: Dinidu
Approved by: Dinidu (written after the fact — this change predates the spec process and is recorded here as the worked example)
Updates: specs/product/currency.md
Implemented in: dinidumissaka-des/minti#52

## Problem
`user_settings.base_currency` decided what an entry saved without a currency
meant. Its value was taken from whatever the app happened to display the first
time an account loaded after the currency migration, and it was then shown on
the currency page beside the display currency as if it were a second
preference.

When it was wrong, it divided a whole history by an exchange rate. An account
displaying LKR while spending in AED read a 205 AED registration fee as 2.49
and a 7,387 budget as 89.54, with nothing on screen naming the cause.

## Decision
Answer the question once, in the migration, by stamping the currency onto
every untagged row — rather than storing the answer as config that can later
change underneath the data. Remove the Base currency row.

## Rules
- There is one currency setting: the display currency.
- An untagged amount is taken at face value in the display currency, never
  divided by a stored guess.
- The budget and monthly income carry their own currency, like every other
  amount.

## Acceptance criteria
- **CUR-1**, **CUR-4** in `specs/product/currency.md`.

## Out of scope
Dropping `base_currency` — it stays on the table so a rollback still finds it.

## Risks and rollout
The stamp is permanent and copies whatever `base_currency` says, so the
migration prints a check to run first.
