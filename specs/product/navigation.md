# Navigation and account

Status: Accepted · Code: `components/ui/PushPage.tsx`, `components/ui/ListRow.tsx`, `components/AccountPage.tsx`, `components/CurrencyPage.tsx`, `components/HeroAmount.tsx`

## Rules
- **Views**: Expenses, Bills and Insights are bottom-nav tabs (mobile) or the
  sections nav (desktop). A nav destination never also appears in a menu.
- **Figures carry their own context.** Every hero renders through
  `HeroAmount`: the month chip (mobile) and the tappable currency code sit on
  the figure. Swiping the hero steps the month.
- **Pushed pages**: Account, Currency and the converter are `PushPage`s — in
  from the right, back arrow with the title beneath, holding a history entry
  so hardware and browser back close them. Only the top page answers Escape
  or back. A page opened from a page is declared after it in `page.tsx`.
- **Rows**: `ListRow` navigates when it ends in a chevron and acts in place
  when it doesn't. Rows read label-primary, value-secondary.
- **Account page**: opened from the header avatar — identity, then Your
  account / Settings / Session. Sign out asks first.
- **Pickers** (category, date, month, source) always open in a `BottomDrawer`.

## Acceptance criteria
- **NAV-1** Given any pushed page, when the device or browser back is used,
  then that page — and only that page — closes. Verify: manual.
- **NAV-2** Given Currency opened from Account, when its back arrow is tapped,
  then Account is still open underneath. Verify: manual.
- **NAV-3** Given the hero on mobile, then its month and currency are visible
  without opening a menu. Verify: manual.
- **NAV-4** Given Sign out is tapped, then the app asks before signing out.
  Verify: manual.
