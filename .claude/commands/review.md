# Review recent changes

Review the current branch diff against its spec and the design system.

Steps:
1. Run `git diff main...HEAD` (or `git diff HEAD~1` if on main).
2. Find the spec: a `specs/changes/*.md` file in the diff, or the one the PR links. If behaviour changed and there is none, that is the first finding.
3. **Spec compliance**
   - Every acceptance criterion is met, and each testable one has a test named by its ID.
   - Nothing was built that the spec doesn't ask for.
   - If the change shipped, the spec says `Status: Shipped` and its rules are folded into `specs/product/` or `specs/design/`.
4. **Design system** — check every UI change against `specs/design/design-system.md`: `ink`-opacity utilities on content surfaces (never literal white/black), `bg-accent-fill` only for solid fills, named tokens instead of bracket values or hexes, `transform`/`opacity`-only motion, `rounded-full` buttons, press feedback with `transform` in the transition list, number inputs hiding spinners.
5. Run `npm run typecheck` and `npm test` and report any failures.
6. Report findings grouped by file with line references, then a verdict: Ready / Needs fixes.
