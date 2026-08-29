# Minti — Personal Finance PWA

## Overview

Minti is a mobile-first personal expense tracker built as a Progressive Web App. Users log daily expenses and recurring subscriptions, track spending against a monthly budget, and switch between currencies — all from a beautifully crafted glass-morphism interface.

**Live product:** personal finance tracker for daily use  
**Type:** Full-stack PWA  
**Role:** Solo designer & developer

---

## The Problem

Most personal finance apps are either too complex (full desktop dashboards) or too plain (basic native apps). I wanted something that felt premium and fast on mobile — closer to Wise or Revolut in visual polish — while staying laser-focused on the two things people actually do: log what they spent today, and check if they're over budget.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router, TypeScript |
| Database & Auth | Supabase (PostgreSQL + Row Level Security) |
| Styling | Tailwind CSS v3 |
| Background | OGL/WebGL (custom light rays shader) |
| Icons | Lucide React |
| PWA | Custom service worker + Web App Manifest |
| Animations | GSAP |

---

## Features Built

### Core Expense Tracking
- Add expenses with description, amount, category, and date
- Inline edit and delete with confirmation prompts
- Swipe-to-reveal edit/delete actions on mobile (touch gesture with spring physics)
- Filter expenses by category with animated pill tabs
- Date dividers grouping expenses by day

### Subscriptions
- Separate subscriptions view for recurring monthly costs
- Inline add/edit/delete — no page navigation required
- Subscription total rolled into the monthly budget calculation and StatsBar

### Budget & Stats
- Monthly budget with a visual progress bar (spent vs. limit)
- Tap-to-edit budget in place
- Stats bar showing: month total (hero), today's spending, and average spend per day
- Budget and currency preferences persist across devices via a `user_settings` table

### Multi-Currency
- 19 currencies supported (AED default — built for the UAE/Gulf region)
- Currency picker via bottom sheet drawer
- Per-currency decimal formatting (e.g. KWD shows 3 decimals, JPY shows 0)
- `formatAmount()` utility handles locale-aware thousands separators

### Authentication
- Email/password sign-up and sign-in
- Google OAuth one-tap sign-in
- Session-aware data loading — expenses wait for auth before fetching

### CSV Export
- Export current month's expenses as a CSV file
- Export subscriptions as a CSV file
- Filename includes month and year (e.g. `minti-expenses-May-2026.csv`)

### PWA & Offline
- Installable on iOS and Android home screens
- Custom install prompt component (bypasses default browser UI)
- Service worker with network-first caching strategy and offline fallback
- iOS status bar blended with app background via `viewport-fit=cover`
- Safe-area insets handled for notched devices

### Mobile UX
- Bottom navigation bar with icon tabs (Expenses / Subscriptions)
- Haptic feedback on swipe gestures
- Autofill background override for dark themed inputs
- 16px font-size on all inputs to prevent iOS auto-zoom on focus
- Hidden scrollbars on mobile without disabling scroll
- Gradual blur fade at the bottom of content lists

---

## Design System

The entire UI is built around a dark glass-morphism system — no off-the-shelf component library, all custom.

**Key rules:**
- No opaque surface colors. Every background is `bg-white/[0.07]` (or similar opacity) so the WebGL background bleeds through
- Accent color: `#FF6200` (orange). Text on accent: `#FFFFFF`
- Danger: `rgb(224 92 92)` — used for delete states
- All typography: Manrope (including `font-mono` override)
- Cards: `GlassSurface` with `borderRadius={28}` — never raw divs
- Inputs: transparent with white/10 border, focused to white/30
- Rounded language: `rounded-full` for pills/tabs, `rounded-lg` for inputs

---

## Technical Highlights

### GlassSurface Component

The most technically complex piece in the app. `GlassSurface` creates a real frosted-glass card effect using SVG displacement maps applied as a CSS `backdrop-filter`. It:

- Generates a dynamic SVG displacement map based on the element's actual measured size (via `ResizeObserver`)
- Applies chromatic aberration by displacing the red, green, and blue channels independently using `feDisplacementMap` and `feColorMatrix` SVG filters
- Detects browser support at runtime (Safari and Firefox don't support `backdrop-filter: url(...)`) and falls back to a standard `backdrop-blur` + opacity approach
- Re-renders the displacement map on resize with a 150ms debounce

### WebGL Background (LightRays)

A full-screen WebGL animation using OGL (a minimal WebGL library) that renders animated light rays via a GLSL fragment shader. Runs on a single triangle covering the viewport. Features include configurable ray origin, color, spread, speed, pulsating mode, noise distortion, and optional mouse-following behavior.

### Swipe Gestures

Mobile swipe-to-reveal on both expense rows and subscription rows — built from scratch with pointer events. Implements spring physics for the snap-back animation and calls haptic feedback (`navigator.vibrate`) on trigger.

### Cross-Device Settings Sync

Budget and currency are stored in a `user_settings` Supabase table with upsert semantics (`onConflict: 'user_id'`). Any device the user logs in on picks up their last-saved budget and currency instantly.

### Animated Category Picker

The category picker opens inline (not in a drawer) with a GSAP scatter animation — each category pill flies in from a random direction. Date picker uses the same scatter pattern. Both are mutually exclusive (opening one closes the other).

### CTA Button Effect

The primary "Add" button has a layered visual effect built in CSS: an animated rotating conic-gradient shimmer border on hover, a glass sheen overlay, and a top-edge reflection. All in Tailwind utilities and inline CSS variables — no canvas or JS animation.

---

## Database Schema

```sql
-- expenses (RLS enabled)
id           uuid primary key
user_id      uuid references auth.users
description  text
category     text
amount       numeric
date         text  -- YYYY-MM-DD
time         text  -- HH:MM AM/PM
created_at   timestamptz

-- subscriptions (RLS enabled)
id           uuid primary key
user_id      uuid references auth.users
name         text
amount       numeric
category     text
billing_day  integer default 1
created_at   timestamptz

-- user_settings (RLS enabled)
user_id      uuid primary key references auth.users
budget       numeric
currency     text
updated_at   timestamptz
```

Row Level Security ensures users can only read and write their own data — no application-layer filtering needed.

---

## Categories

9 color-coded categories with distinct accent colors:

Food & Dining · Grocery · Transport · Shopping · Entertainment · Health · Utilities · Travel · Education

---

## Challenges & Decisions

**Why not use a UI library?**  
The glass-morphism aesthetic required full control over every surface. Shadcn primitives are used only for the most basic elements (Button, Input, Label). Everything else is custom.

**Why OGL instead of Three.js?**  
OGL is ~8KB vs Three.js at ~600KB. The background shader only needs a single triangle and a fragment program — OGL is the right tool for this scope.

**iOS PWA quirks**  
iOS has specific behavior around status bar color, safe-area insets, and form autofill background color. Each required its own targeted fix: `viewport-fit=cover`, `env(safe-area-inset-*)` padding, and `box-shadow` inset override for autofill's forced yellow background.

**Service worker strategy**  
Network-first with cache fallback — not cache-first. This avoids a stale flash of cached UI when the user has connectivity, while still serving something offline.

---

## Commits at a Glance

The project evolved from a basic CRUD app through several meaningful phases:

1. **Foundation** — Supabase integration, auth, expense CRUD, Manrope font
2. **Design system** — Glass cards, WebGL background, grain overlay, dark inputs
3. **UX layer** — Swipe gestures, animated category/date pickers, inline edit
4. **Mobile polish** — Bottom nav, safe-area, status bar, iOS autofill, haptics
5. **Features** — Budget bar, multi-currency, subscriptions, stats, CSV export
6. **PWA** — Service worker, install prompt, offline caching, app icons
7. **Performance** — Memoized components, deferred state, network-first caching
8. **Cross-device** — `user_settings` table for budget + currency sync
