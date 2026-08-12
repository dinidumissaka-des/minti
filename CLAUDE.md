# Minti — Claude Project Context

## What this is
A mobile-first personal expense tracker PWA. Users log daily expenses and recurring subscriptions, track against a monthly budget, and switch currencies. Primary audience is mobile users.

## Tech stack
- **Framework**: Next.js 14 App Router, TypeScript, `"use client"` components throughout
- **Database + Auth**: Supabase (email/password auth, RLS on all tables)
- **Styling**: Tailwind CSS v3 — glass morphism design system with light/dark theme support (see Design system rules)
- **Background**: OGL/WebGL for LightRays animation
- **Icons**: lucide-react
- **PWA**: Custom service worker (`public/sw.js`), manifest (`app/manifest.ts`), install prompt

## Project structure
```
app/
  layout.tsx        Root layout — mounts AppBackground (LightRays), InstallPrompt, ServiceWorkerRegistration, theme-init script
  page.tsx          Main app — all top-level state (user, expenses, subscriptions, view, filter, currency)
  globals.css       Theme CSS variables (`:root`/`.dark`/`.light`) + Tailwind base
  manifest.ts       PWA manifest

components/
  background/       LightRays.tsx (WebGL rays), AppBackground.tsx (theme-aware wrapper), GrainOverlay.tsx (defined but not currently mounted) — purely visual, no business logic
  expense/          AddExpenseForm, ExpenseList (pickers live in ui/DrawerPickers.tsx)
  subscription/     SubscriptionList — list + inline add/edit/delete
  ui/               Shadcn primitives (button, input, label) + DrawerPickers.tsx (CalendarPicker/CategoryList/SourceList — rendered inside BottomDrawer app-wide)
  GlassSurface.tsx  Core reusable glass card (SVG displacement + backdrop-blur)
  BottomDrawer.tsx  Modal sheet — currency/category/date pickers, currency converter, mobile "More" menu
  StatsBar.tsx      Month total (hero), Today, Avg/Day — includes subscriptionsTotal
  BudgetBar.tsx     Monthly budget progress bar
  AuthForm.tsx      Sign in / sign up
  ThemeContext.tsx  Light/dark theme provider — `useTheme()` returns `{ theme, toggleTheme }`, persists to localStorage (`minti_theme`)
  PrivacyContext.tsx Hide-amounts provider — `usePrivacy()` returns `{ privacyMode, togglePrivacy, mask }`
  Logo.tsx
  InstallPrompt.tsx
  ServiceWorkerRegistration.tsx

lib/
  supabase.ts       All DB + auth functions — expenses CRUD, subscriptions CRUD, auth
  categories.ts     CATEGORY_COLORS_DARK / CATEGORY_COLORS_LIGHT maps + getCategoryColor(category, theme) — keys are the valid category names
  currencies.ts     CURRENCIES list, DEFAULT_CURRENCY, formatAmount()
  brand.ts          Literal brand colors for the PWA manifest / theme-color meta / Capacitor shell
  exchangeRates.ts  Live FX rates with a 6h localStorage cache
  export.ts         CSV export — blob download on web, share sheet on iOS
  utils.ts          cn() — Tailwind class merging
  platform.ts       isNative() / isIOSNative() — the switch every native branch reads
  haptics.ts        Taptic Engine on iOS, navigator.vibrate fallback on web
  appLock.ts        Face ID / passcode gate (native only)
  notifications.ts  Subscription billing reminders (native only)
  widget.ts         Publishes the home-screen widget snapshot (native only)

hooks/
  useIsMobile.ts    640px breakpoint hook

types/
  index.ts          Expense, NewExpense, Subscription, NewSubscription, Income, NewIncome

ios/                Capacitor iOS project — two Xcode targets (App, MintiWidget)
  App/App/          AppDelegate, WidgetSync.swift, entitlements, PrivacyInfo.xcprivacy
  App/MintiWidget/  WidgetKit extension (SwiftUI)
```

## Web and iOS
One codebase, two build targets. `npm run build` is the web build and is unaffected by anything iOS; `npm run ios:sync` static-exports the same source (`BUILD_TARGET=mobile` turns on `output: "export"`) and copies it into the Xcode project.

Anything that differs between platforms goes behind `isNative()` from `lib/platform.ts` — never a user-agent sniff. Native-only paths today: session storage, OAuth flow, Sign in with Apple, CSV delivery, haptics, app lock, notifications, the widget, and skipping the service worker and install prompt. **After changing web source, run `npm run ios:sync` or the app ships a stale bundle.** See README for the iOS build and the App Group / Supabase redirect setup.

## Design system rules
The app supports light and dark themes (toggle in the header, defaults to OS preference, persisted to `localStorage` as `minti_theme`). Theming works via CSS variables that flip on an `.light`/`.dark` class on `<html>` (set in `app/globals.css`). There are two categories of surface — pick the right one, don't guess:

**1. Content surfaces** (GlassSurface cards, list rows, inputs, body text, BottomDrawer sheets, InstallPrompt) — these fully adapt per theme:
- **Never** use literal `white`/`black` opacity utilities (`bg-white/7`, `text-white`, etc.) here — they don't flip with the theme. Always use `ink`-opacity utilities:
  - Backgrounds: `bg-ink/7`, `bg-ink/4`, `bg-ink/10`
  - Borders: `border-ink/10`, `border-ink/15`
  - Text: `text-ink`, `text-ink/40`, or `text-muted` (= ink/50%)
  - In inline JS styles, use `"rgb(var(--ink) / 0.07)"` instead of a literal `rgba(255,255,255,0.07)` string.
- For a genuinely opaque panel that needs a solid backdrop (BottomDrawer, InstallPrompt), use `style={{ backgroundColor: "rgb(var(--background) / 0.85)" }}` — not a hardcoded hex — so it flips light/dark too.
- **Glass cards**: always use `<GlassSurface borderRadius={28} backgroundOpacity={0.07}>`, not raw divs — it already adapts its frost/border per theme via `.light` CSS overrides in `GlassSurface.css` (no drop shadow — removed intentionally).
- **Inputs**: `bg-ink/7 border border-ink/10 rounded-lg px-3 text-ink outline-none focus:border-ink/30` — hide number spinners with `[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`

**2. Flat chips** (desktop header pills — currency/CSV/converter/month-nav, the desktop Sections segmented nav, filter tabs, category tags) — a Wise-style flat fintech look: solid fill, no blur/translucent glass, fully theme-adaptive via three shared utility classes in `globals.css` (all driven by `--ink`, so no `.light` override needed per-component):
  - `.flat-chip` (unselected/track state), `.flat-chip-active` (selected state), `.flat-chip-dashed` (dashed empty-state border).
  - Usage: `className="rounded-full border flat-chip text-ink/40 hover:text-ink/90"` — no `backdrop-blur`.
  - If a chip needs a different opacity, tune the shared class in `globals.css`, not a one-off value in the component.

**3. Glass chrome** (the mobile bottom nav and the mobile header controls) — floating surfaces that content scrolls beneath, matching the iOS convention of frosted controls over moving content:
  - `.glass-chip` and `.glass-chip-active` in `globals.css` — `backdrop-filter: blur(24px) saturate(180%)` plus an inset top highlight that stands in for the specular rim iOS draws natively.
  - **Only use these where content actually passes underneath.** `backdrop-filter` has nothing to sample over a static background, so glass on a non-scrolling surface just renders as a translucent fill. The mobile header is `sticky` for exactly this reason; the desktop header is not, and keeps `flat-chip`.
  - Everything else — filter tabs, category tags, the desktop segmented nav, the desktop header rows — stays `flat-chip`. The Wise-style flat look is still the default; glass is the exception for floating chrome.
  - Apple's real Liquid Glass is a native material (`.glassEffect()`, iOS 26+) and is unavailable to a WKWebView. This is a CSS approximation: it gets the frost and saturation, not the edge refraction or motion-tracked highlights.

**Accent & danger — fill vs bare text, in both surface types:**
- **Fill** (buttons, badges, progress bars, active-pill highlights — dark text sits on top, or it's just a colored bar): `bg-accent-fill`, `border-accent-fill`, `ring-accent-fill` (and `-fill` for danger) — same bright green/red in both themes. Text on an accent fill: `text-accent-on`.
- **Bare text/icon** (needs to read directly against a background, not sit on a solid fill): `text-accent` / `text-danger` — these are theme-adaptive (darker in light mode for contrast). Never use the raw hex `#9FE870` for this — that's what `text-accent` breaks contrast on light backgrounds.
- **Category colors**: use `getCategoryColor(category, theme)` from `lib/categories.ts` (theme from `useTheme()`), not the raw `CATEGORY_COLORS` map, anywhere a category color is the actual rendered swatch/text/chart color.

**Token layer** — every color resolves from a CSS variable in `app/globals.css`; there are no loose hexes in components.
- `--background`, `--ink`, `--accent` (fill), `--accent-hi`/`--accent-lo` (button gradient stops), `--accent-text` (bare accent text), `--accent-on` (text sitting on an accent fill), `--danger`, `--danger-text`, `--scrim` (modal backdrop).
- Tailwind's opacity scale only steps in fives, so `tailwind.config.ts` extends it with `3, 4, 6, 7, 8` for the low-alpha surface steps. **A step outside that scale silently generates no CSS** — add it to the config rather than reaching for `ink/[0.07]` bracket syntax.
- Platform manifests can't read CSS variables, so `lib/brand.ts` holds those literals in one place. Keep it in sync with `--background`.

**Layout scales** — same rule as color: name it in `tailwind.config.ts`, don't bracket it in a component.
- **Z-index**: `z-background` (0), `z-content` (10), `z-nav` (50), `z-prompt` (55), `z-scrim` (60), `z-drawer` (70), `z-skip` (200), `z-lock` (300). New overlays join this ladder — never invent a bigger number inline.
- **Radius**: `sm` 6 · `DEFAULT` 10 · `md` 12 · `lg` 16 · `xl` 20 · `2xl` 24 · `3xl` 32 · `full`. `md` and `lg` were both 16px until they were split, so anything written before that reads `rounded-lg`.
- **Type**: `text-body` (15px) is the list-row / menu-row size, between `text-sm` and `text-base`.
- **Sizing**: `h-control`/`w-control` (52px) is the standard input and button height; `w-reveal` (60px) is the hover-reveal action strip.
- One-off layout measurements (a `min-w` that only stops a single label from jittering) stay as bracket values — they are local constraints, not system tokens.

**Other rules:**
- **Pill buttons** (active state, on a content surface): `bg-ink/10 backdrop-blur-md text-ink font-semibold border border-ink/15`
- **Rounded**: use `rounded-full` for filter tabs and toggle pills, `rounded-lg` for inputs, `borderRadius={28}` for GlassSurface cards
- **Font**: Manrope for everything. `font-mono` class still uses Manrope (overridden in tailwind.config.ts)
- **No comments** unless the WHY is non-obvious. No docstrings.

## Database schema
```sql
-- expenses
id uuid, user_id uuid, description text, category text, amount numeric,
date text (YYYY-MM-DD), time text (HH:MM AM/PM), created_at timestamptz

-- subscriptions
id uuid, user_id uuid, name text, amount numeric, category text,
billing_day integer default 1, created_at timestamptz
```
RLS enabled on both tables. `billing_day` exists in DB but is hidden from UI (hardcoded to 1).

## Key patterns
- **Category/date picker**: `CategoryList`/`CalendarPicker`/`SourceList` (`components/ui/DrawerPickers.tsx`) always render inside a `BottomDrawer` — used from AddExpenseForm, ExpenseList/SubscriptionList edit rows, IncomeSection
- **Hover-reveal actions**: edit/delete buttons use `w-0 group-hover:w-[60px] overflow-hidden transition-all duration-200` inside a `group` parent
- **onChanged callback**: SubscriptionList receives `onChanged: () => void` and calls it after any mutation to re-fetch
- **View state**: `view: "expenses" | "subscriptions"` lives in page.tsx. Expenses view shows AddExpenseForm + filter tabs + ExpenseList. Subscriptions view shows SubscriptionList only.
- **subscriptionsTotal**: calculated in page.tsx, passed to StatsBar and added to BudgetBar `spent`
