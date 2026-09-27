# Minti — Claude Project Context

## What this is
A mobile-first personal expense tracker PWA. Users log daily expenses and recurring subscriptions, track against a monthly budget, and switch currencies. Primary audience is mobile users.

## How we work: specs first
**`specs/` is the source of truth. Code is written to satisfy a spec, and the tests prove it does.** See `specs/README.md` for the full loop.

- Before changing behaviour, read the spec that covers it (`specs/product/*.md`, `specs/design/design-system.md`).
- If no spec covers the change, or it would contradict one, **write or update a change spec in `specs/changes/` first and stop for approval**. Don't write code against a spec whose status isn't `Approved`.
- Build what the spec says and nothing else. Anything extra is a new spec.
- Every testable acceptance criterion gets a test in `tests/` whose name starts with its ID (`it("CUR-3: …")`). Logic that a criterion depends on goes in `lib/` as a pure function so it can be tested.
- When a change ships, set it to `Status: Shipped` and fold its rules into the matching `specs/product/` or `specs/design/` file in the same PR.
- Before pushing: `npm run typecheck && npm test && npm run build`.
- Commands: `/spec` drafts a change spec, `/implement` builds one, `/review` checks the diff against it.

## Tech stack
- **Framework**: Next.js 14 App Router, TypeScript, `"use client"` components throughout
- **Database + Auth**: Supabase (email/password auth, RLS on all tables)
- **Styling**: Tailwind CSS v3 — glass morphism design system with light/dark theme support (see Design system rules)
- **Icons**: lucide-react
- **PWA**: Custom service worker (`public/sw.js`), manifest (`app/manifest.ts`), install prompt

## Project structure
```
app/
  layout.tsx        Root layout — mounts InstallPrompt, ServiceWorkerRegistration, theme-init script
  page.tsx          Main app — all top-level state (user, expenses, subscriptions, view, filter, currency)
  globals.css       Theme CSS variables (`:root`/`.dark`/`.light`) + Tailwind base
  manifest.ts       PWA manifest

components/
  expense/          AddExpenseForm, ExpenseList (pickers live in ui/DrawerPickers.tsx)
  subscription/     SubscriptionList — list + inline add/edit/delete
  ui/               Shadcn primitives (button, input, label) + DrawerPickers.tsx (CalendarPicker/MonthPicker/CategoryList/SourceList — rendered inside BottomDrawer app-wide) + PushPage.tsx / ListRow.tsx / Switch.tsx (the full-screen page shell, its rows, and the row toggle)
  Surface.tsx       The one raised surface — paints --surface opaque, owns the card radius
  BottomDrawer.tsx  Modal sheet — month/category/date pickers, add-expense sheet (currency and the converter are pushed pages, not sheets)
  AccountPage.tsx   Full-screen account page pushed in from the header avatar — identity block + Your account / Settings / Session rows (replaced the "⋯" More menu)
  CurrencyPage.tsx  Pushed page holding the currency errands — Change currency and Convert currency. There is exactly one currency setting; a second "base currency" row was removed once every amount carried its own
  Avatar.tsx        Profile circle — OAuth photo when the session has one, initials otherwise; also exports displayName()
  HeroAmount.tsx    The big figure at the top of a view — label, month chip, tappable currency, swipe-to-change-month
  MonthChip.tsx     Mobile month pill (`Sep 2026 ⌄`) — opens the month picker
  StatsBar.tsx      Month total (hero), Today, Avg/Day — includes subscriptionsTotal
  BudgetBar.tsx     Monthly budget progress bar
  AuthForm.tsx      Sign in / sign up
  MoneyContext.tsx  Supplies the `Money` converter to the two sections that fetch their own rows (AnalyticsView's previous month, IncomeSection's entries)
  ThemeContext.tsx  Light/dark theme provider — `useTheme()` returns `{ theme, toggleTheme }`, persists to localStorage (`minti_theme`)
  PrivacyContext.tsx Hide-amounts provider — `usePrivacy()` returns `{ privacyMode, togglePrivacy, mask }`
  Logo.tsx
  InstallPrompt.tsx
  ServiceWorkerRegistration.tsx

lib/
  supabase.ts       All DB + auth functions — expenses CRUD, subscriptions CRUD, auth
  categories.ts     CATEGORY_COLORS_DARK / CATEGORY_COLORS_LIGHT maps + getCategoryColor(category, theme) — keys are the valid category names
  currencies.ts     CURRENCIES list, DEFAULT_CURRENCY, formatAmount()
  months.ts         MONTH_NAMES_SHORT / MONTH_NAMES_LONG / monthLabel()
  bills.ts          isActiveInMonth() / changeMode() — the month rules every bill write follows
  suggestions.ts    buildSuggestions() — ranks the add-form's repeat chips across the whole history
  brand.ts          Literal brand colors for the PWA manifest / theme-color meta / Capacitor shell
  exchangeRates.ts  Live FX rates with a 6h localStorage cache
  money.ts          `makeMoney()` / `toDisplay()` — the conversion layer. Rows are converted once, at the boundary
  export.ts         CSV export — blob download on web, share sheet on iOS
  utils.ts          cn() — Tailwind class merging
  platform.ts       isNative() / isIOSNative() — the switch every native branch reads
  haptics.ts        Taptic Engine on iOS, navigator.vibrate fallback on web
  appLock.ts        Face ID / passcode gate (native only)
  notifications.ts  Subscription billing reminders (native only)
  widget.ts         Publishes the home-screen widget snapshot (native only)

specs/
  README.md         The spec-first loop and the index of specs
  _template.md      What every change spec starts from
  product/          The app's behaviour, one file per area, with acceptance criteria
  design/           The design system
  changes/          One numbered, approved spec per change

tests/              Vitest — one test per acceptance criterion, named by its ID

hooks/
  useIsMobile.ts    640px breakpoint hook
  useRates.ts       Rates for one display currency; seeded synchronously from the cache and never used for a base other than the one on screen

types/
  index.ts          Expense, NewExpense, Subscription, NewSubscription, Income, NewIncome

ios/                Capacitor iOS project — two Xcode targets (App, MintiWidget)
  App/App/          AppDelegate, WidgetSync.swift, entitlements, PrivacyInfo.xcprivacy
  App/MintiWidget/  WidgetKit extension (SwiftUI)
```

## Web and iOS
One codebase, two build targets. `npm run build` is the web build and is unaffected by anything iOS; `npm run ios:sync` static-exports the same source (`BUILD_TARGET=mobile` turns on `output: "export"`) and copies it into the Xcode project.

Anything that differs between platforms goes behind `isNative()` from `lib/platform.ts` — never a user-agent sniff. Native-only paths today: session storage, OAuth flow, Sign in with Apple, CSV delivery, haptics, app lock, notifications, the widget, and skipping the service worker and install prompt. **After changing web source, run `npm run ios:sync` or the app ships a stale bundle.** See README for the iOS build and the App Group / Supabase redirect setup.

## Design system
The full rules live in **`specs/design/design-system.md`** — read it before any UI change. The ones that are broken most often:
- Content surfaces use `ink`-opacity utilities (`bg-ink/7`, `border-ink/10`, `text-ink/60`), never literal `white`/`black`.
- Raised surfaces are opaque `--surface`; cards are `<Surface borderRadius={28}>`.
- `bg-accent-fill` (brand green) is for solid fills only, labelled `text-accent-on`; `text-accent` is the theme-inverting neutral that marks state. The logo is `text-brand`.
- Every colour, z-index, radius, duration and easing is a named token — no loose hexes, no bracket values that reinvent a scale step.
- Animate `transform` and `opacity` only. Every button is `rounded-full`.

## Database schema
```sql
-- expenses
id uuid, user_id uuid, description text, category text, amount numeric,
currency text, date text (YYYY-MM-DD), time text (HH:MM AM/PM), created_at timestamptz

-- subscriptions — one row is one *version* of a bill, valid for a range of
-- months. Active in month M when start_month <= M and (end_month is null or
-- end_month >= M); both are 'YYYY-MM', so string comparison is chronological.
id uuid, user_id uuid, name text, amount numeric, currency text, category text,
billing_day integer default 1, start_month text, end_month text, created_at timestamptz

-- income_entries carries `currency` too. user_settings carries `budget_currency`
-- and `income_currency` — the budget and the monthly income are amounts like any
-- other, so each records what it was entered in. `base_currency` is superseded
-- and unread; the migration stamps its value onto older rows and leaves the
-- column in place for rollback.
```
RLS enabled on both tables. `billing_day` exists in DB but is hidden from UI (hardcoded to 1).

## Behaviour
What the app does, and the acceptance criteria that test it, live in `specs/product/` — currency, bills, suggestions, deletes, navigation. See `specs/README.md` for the index. Don't restate those rules here; a second copy is how they drifted before.

## Code patterns
Implementation conventions, not behaviour — these stay here:
- **View state**: `view` lives in `page.tsx`. The expenses view shows AddExpenseForm + ExpenseList; bills shows SubscriptionList only.
- **onChanged**: SubscriptionList receives `onChanged: () => void` and calls it after any mutation to re-fetch.
- **subscriptionsTotal** is calculated in `page.tsx`, passed to StatsBar and added to BudgetBar `spent`.
- **Hover-reveal actions**: edit/delete use `w-0 group-hover:w-[60px] overflow-hidden transition-all duration-200` inside a `group` parent.
