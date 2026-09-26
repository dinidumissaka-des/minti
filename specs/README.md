# Specs

Minti is built spec-first. A spec says what the app must do and why; the code
is written to satisfy it, and the tests prove it does. When the spec and the
code disagree, the spec wins — or the spec is changed first, on purpose.

## Layout

| Folder | Holds | Changes when |
|---|---|---|
| `product/` | One file per feature area — the rules it follows today and the acceptance criteria that test them | A change spec ships |
| `design/` | The design system | A change spec ships |
| `changes/` | One numbered file per change — the proposal, approval and outcome | Every new feature or behaviour change |
| `_template.md` | What a change spec starts from | Rarely |

`product/` and `design/` describe the app as it is. `changes/` is the history
of how it got there — never rewritten once shipped.

## The loop

1. **Spec** — `/spec <what you want>` drafts `changes/NNNN-<slug>.md` from the
   template and stops. No code yet.
2. **Approve** — the spec goes up as its own PR. The product owner, UX designer
   and service designer review it (see `CODEOWNERS`); it merges with
   `Status: Approved` and every approver named.
3. **Implement** — `/implement specs/changes/NNNN-<slug>.md` builds exactly what
   the spec says and writes one test per acceptance criterion, named by its ID.
4. **Review** — `/review` and the Claude PR review check the diff against the
   linked spec. Anything built that the spec doesn't ask for is a finding.
5. **Ship** — the implementation PR sets the change to `Status: Shipped` and
   folds its rules and criteria into the matching `product/` or `design/` file.

Small fixes that don't change behaviour (a typo, a crash that breaks an
existing criterion, a dependency bump) skip steps 1–2 and write `Spec: none —
<reason>` in the PR.

## Acceptance criteria

Every criterion has a stable ID (`CUR-3`, `BILL-5`) and is written
Given / When / Then, so it can be tested and quoted. A criterion that can be
checked in `lib/` gets a Vitest test in `tests/` whose name starts with its ID.
One that can only be checked in the UI says `Verify: manual` and how.

IDs are never reused. A retired criterion is struck through, not deleted.

## Index

| Spec | Prefix | Tests |
|---|---|---|
| [product/currency.md](product/currency.md) | `CUR` | `tests/currency.test.ts` |
| [product/bills.md](product/bills.md) | `BILL` | `tests/bills.test.ts` |
| [product/suggestions.md](product/suggestions.md) | `SUG` | `tests/suggestions.test.ts` |
| [product/deletes.md](product/deletes.md) | `DEL` | manual |
| [product/navigation.md](product/navigation.md) | `NAV` | manual |
| [design/design-system.md](design/design-system.md) | — | `/review`, `ui-reviewer` |
