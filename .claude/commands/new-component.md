# Scaffold a new component

Create a new React component for Minti following project conventions.

Arguments: $ARGUMENTS (component name and optional folder, e.g. "BudgetHistory" or "expense/SpendingChart")

Steps:
1. Check the change spec this component belongs to (`specs/changes/`). If there is no approved spec for it, stop and suggest `/spec` first.
2. Determine the correct folder:
   - Expense-specific UI → `components/expense/`
   - Subscription-specific UI → `components/subscription/`
   - Shared primitive → `components/ui/`
   - Shared across features → `components/` root
3. Create the file with:
   - `"use client";` at the top
   - Named Props interface
   - Tailwind classes only, following `specs/design/design-system.md`: `ink`-opacity utilities (`bg-ink/7`, `border-ink/10`, `text-ink/60`) — never literal `white`/`black`
   - Card content wrapped in `<Surface borderRadius={28}>`
   - No comments unless the why is non-obvious
4. Export as default function
5. Report the file path created
