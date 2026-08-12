# Review recent changes

Review the current branch diff for quality, correctness, and consistency with Minti's design system.

Steps:
1. Run `git diff main` (or `git diff HEAD~1` if on main) to get the full diff
2. Check each changed file for:
   - **Design system violations**: `bg-surface`, `border-border`, `bg-surface2` usage (should use white-opacity utilities)
   - **Number inputs**: missing `[appearance:textfield]` spinner-hide classes
   - **Unused imports**: any imports not referenced in JSX/logic
   - **TypeScript**: run `npx tsc --noEmit` and report any errors
   - **Wrong folder**: components in wrong subfolder per CLAUDE.md structure
   - **Styling inconsistencies**: hardcoded hex colors that should use design tokens
3. Report findings grouped by file with line references
4. Give an overall verdict: Ready / Needs fixes
