# Scaffold a new component

Create a new React component for Minti following project conventions.

Arguments: $ARGUMENTS (component name and optional folder, e.g. "BudgetHistory" or "expense/SpendingChart")

Steps:
1. Determine the correct folder:
   - Expense-specific UI → `components/expense/`
   - Subscription-specific UI → `components/subscription/`
   - Background/visual only → `components/background/`
   - Shared across features → `components/` root
2. Create the file with:
   - `"use client";` at the top
   - Named Props interface
   - Tailwind classes only — use `bg-white/[0.07]`, `border-white/[0.1]` (never `bg-surface` or `border-border`)
   - Wrap card content in `<Surface borderRadius={28}>`
   - No comments unless non-obvious
3. Export as default function
4. Report the file path created
