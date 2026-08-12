# Spendr Design System

Loaded when working on UI, styling, or component tasks.

The app supports light and dark themes (CSS variables flip on `.light`/`.dark` class on `<html>`, see `app/globals.css`). There are two categories of surface — check which one you're styling before picking a color:

## 1. Content surfaces — fully theme-adaptive
GlassSurface cards, list rows, inputs, body text, BottomDrawer sheets, InstallPrompt. Use `ink`-opacity utilities, never literal `white`/`black`:

| Use | Class |
|-----|-------|
| Card background | `bg-ink/7` |
| Elevated surface | `bg-ink/10` |
| Subtle border | `border-ink/10` |
| Active border | `border-ink/15` or `border-ink/25` |
| Body text | `text-ink` |
| Muted text | `text-muted` (= ink/50%) |

**Never use**: `bg-surface`, `border-border`, `bg-surface2`, or literal `bg-white/...`, `text-white`, `border-white/...` on a content surface — they don't flip between themes.

For a genuinely opaque panel needing a solid backdrop (BottomDrawer, InstallPrompt), use inline `style={{ backgroundColor: "rgb(var(--background) / 0.85)" }}` instead of a hardcoded hex — it flips light/dark automatically.

## 2. Flat chips — segmented control, buttons, chips, tags
Header icon buttons, currency/CSV/converter/month-nav pills, the Sections segmented nav, filter tabs, the mobile bottom nav bar, category tags. Styled flat and fully theme-adaptive (matches a Wise-style fintech look — solid fill, no blur, no translucent "glass" material) via three shared utility classes in `globals.css`, all driven by `--ink` so they need no `.light` overrides of their own:

```css
.flat-chip         /* unselected/track state:   bg rgb(var(--ink)/0.08), border rgb(var(--ink)/0.14), hover border 0.24 */
.flat-chip-active  /* selected/active state:    bg rgb(var(--ink)/0.16), border rgb(var(--ink)/0.2) */
.flat-chip-dashed  /* dashed empty-state border: border rgb(var(--ink)/0.2) */
```

Usage — no `backdrop-blur`, text color is plain `text-ink` (or `/opacity` variants):
```tsx
className="rounded-full border flat-chip text-ink/40 hover:text-ink/90"
// active/selected:
className={active ? "flat-chip-active text-ink border" : "text-ink/40 hover:text-ink/80"}
```
If a chip needs a stronger fill than `flat-chip` provides, adjust the shared CSS class rather than hardcoding a one-off opacity in the component — keeps every chip in sync.

## 3. Glass chrome — mobile bottom nav + mobile header controls
`.glass-chip` / `.glass-chip-active` (backdrop-blur + inset specular highlight). Only valid where content scrolls beneath — the mobile header is `sticky` so it has something to blur. Desktop header and all other chips stay `flat-chip`.

## Accent & danger — fill vs bare text (applies on both surface types)
- **Fill** (buttons, badges, progress bars, active-pill highlights): `bg-accent-fill` / `border-accent-fill` / `ring-accent-fill` (`#9FE870`, same in both themes). Danger fill: `bg-danger-fill` / `border-danger-fill`. Text on an accent fill: `text-accent-on`.
- **Bare text/icon** (reads directly against a background, not sitting on a solid fill): `text-accent` / `text-danger` — theme-adaptive, darker in light mode for contrast. Never use the raw hex `#9FE870` for this.

**Category colors**: use `getCategoryColor(category, theme)` from `lib/categories.ts` with `theme` from `useTheme()` — not the raw `CATEGORY_COLORS` map — for any category color rendered as text, a dot, or a chart fill.

## Component patterns

### Glass card
```tsx
<GlassSurface borderRadius={28} backgroundOpacity={0.07}>
  <div className="px-5 py-4 w-full">...</div>
</GlassSurface>
```
No drop shadow (removed intentionally) — definition comes from the border, which `GlassSurface.css` already bumps for light mode via `.light` overrides.

### Pill toggle (active/inactive) — e.g. filter tabs inside GlassSurface
```tsx
className={`flex-1 py-2 text-sm font-mono rounded-full transition-colors ${
  active ? "flat-chip-active text-ink font-semibold border"
         : "text-muted hover:text-ink"
}`}
```

### Header/nav pill button
```tsx
className="h-8 px-3 rounded-full border flat-chip text-ink/40 hover:text-ink/90 transition-colors text-xs font-mono"
```

### Input (glass) — content surface
```tsx
className="bg-ink/[0.07] border border-ink/[0.1] rounded-lg px-3 h-10 text-base text-ink placeholder:text-muted outline-none focus:border-ink/30"
```
For number inputs, also add: `[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`

### Hover-reveal action buttons
```tsx
<div className="group flex items-center ...">
  {/* content */}
  <div className="hidden sm:flex gap-1 overflow-hidden w-0 group-hover:w-[60px] transition-all duration-200 flex-shrink-0">
    <button ...><Pencil size={13} /></button>
    <button ...><Trash2 size={13} /></button>
  </div>
</div>
```

### Category tag
```tsx
<span className="text-xs font-mono px-1.5 py-0.5 rounded-full bg-ink/[0.1] text-ink/50">
  {category}
</span>
```

### Inline JS styles (not className)
When a color has to be a literal style value (e.g. dynamic `backgroundColor` on a content surface), use the CSS var directly — it resolves against whichever `.light`/`.dark` class is active:
```tsx
style={{ backgroundColor: isSelected ? ACCENT : "rgb(var(--ink) / 0.07)" }}
```

## Typography
- All text uses Manrope (font-sans, font-mono, font-serif all map to Manrope)
- Hero numbers: `font-mono text-3xl font-bold text-ink`
- Section labels: `font-sans text-xs text-muted font-semibold`, written in Title Case. Not all-caps — Apple's Liquid Glass guidance moved list/table/form section headers to title-style capitalization for legibility
- Body: `text-sm text-ink font-sans`

## Spacing & radius
- GlassSurface cards: `borderRadius={28}` always
- Pill buttons: `rounded-full`
- Inputs: `rounded-lg`
- Gap between cards: `gap-2` in the main flex column
- Inner card padding: `px-5 py-4` (summary rows), `px-4 py-3.5` (list rows)

## Hero stat card (StatsBar)
The "This Month" stat is always full-width with green glow border (accent fill — same in both themes):
```tsx
style={{ boxShadow: "0 0 12px rgba(159,232,112,0.07)", borderColor: "rgba(159,232,112,0.3)" }}
```

## Category/date pickers
`components/ui/DrawerPickers.tsx` (`CalendarPicker`, `CategoryList`, `SourceList`) always render inside a `BottomDrawer` — used from AddExpenseForm, ExpenseList/SubscriptionList edit rows, IncomeSection. `components/expense/CategoryPicker.tsx` and `DatePickerDrawer.tsx` are dead code (unused) — don't build on them.
