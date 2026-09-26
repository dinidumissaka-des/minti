# 0002 — Build Minti spec-first

Status: Approved
Author: Dinidu
Approved by: Dinidu
Updates: specs/README.md, CLAUDE.md
Implemented in: this PR

## Problem
Rules were written down after the bug, not before the code. `CLAUDE.md` grew a
rule each time something broke — the one-currency rule arrived after the
205 AED → 2.49 bug — and the Claude-facing files drifted from it:
`.claude/skills/design-system`, the `ui-reviewer` agent and `/new-component`
still told agents to use `bg-white/[0.07]` and never `bg-surface`, the
opposite of the design system. There were no tests, so nothing checked a rule
was still true.

## Decision
Specs live in `specs/`, are approved before code is written, and every
testable acceptance criterion has a test named by its ID. `CLAUDE.md` points
at the specs instead of restating them, so there is one copy of each rule.

## Rules
- See `specs/README.md`.

## Acceptance criteria
- **PROC-1** Given a PR that changes behaviour, then it links a spec in
  `specs/changes/` or states `Spec: none — <reason>`.
- **PROC-2** Given `npm test`, then every test name starts with an acceptance
  criterion ID.
- **PROC-3** Given a PR, then CI runs typecheck, tests and the web build.
- **PROC-4** Given a change to `specs/`, then its code owners are requested
  for review.

## Out of scope
- ESLint: `next lint` has never been configured here, and turning it on is its
  own change.
- UI tests. The `Verify: manual` criteria stay manual for now.
