# Minti Design System

Loaded when working on UI, styling, or component tasks.

**The rules live in `specs/design/design-system.md`. Read it before changing any UI** — it is the source of truth, and this file only holds copy-paste patterns that follow it. If a pattern here disagrees with the spec, the spec wins; fix this file.

## Patterns

### Card
```tsx
<Surface borderRadius={28}>
  <div className="px-5 py-4 w-full">...</div>
</Surface>
```
Opaque `--surface`, no shadow, no frost. A caller can tint the edge with `style={{ borderColor: … }}`.

### Segmented control (filter tabs, sections nav, analytics tabs)
Use `components/ui/SegmentedControl` — don't hand-roll one.
```tsx
pillClassName="flat-chip-active border rounded-full"
activeClassName="text-chip-on"
inactiveClassName="text-ink/60 hover:text-ink/80"
```

### Header / nav pill button (desktop, flat chip)
```tsx
className="h-8 px-3 rounded-full border flat-chip text-ink/60 hover:text-ink/90 transition-[color,transform] duration-fast active:scale-95 text-xs"
```

### Primary button
```tsx
className="h-control rounded-full bg-accent-fill text-accent-on font-semibold transition-transform duration-fast active:scale-[0.98]"
```

### Input
```tsx
className="bg-ink/7 border border-ink/10 rounded-lg px-3 h-control text-base text-ink placeholder:text-muted outline-none focus:border-ink/40"
```
Number inputs also: `[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`

### Category colour
```tsx
const { theme } = useTheme();
const color = getCategoryColor(category, theme);
```

### Inline style colour
```tsx
style={{ backgroundColor: "rgb(var(--ink) / 0.07)" }}
```

## Typography
- Manrope everywhere (`font-mono` also resolves to Manrope).
- Section labels: `text-xs text-muted font-semibold`, Title Case, not all-caps.
- List and menu rows: `text-body` (15px).

## Pickers
`CalendarPicker`, `MonthPicker`, `CategoryList`, `SourceList` in `components/ui/DrawerPickers.tsx` always render inside a `BottomDrawer`.
