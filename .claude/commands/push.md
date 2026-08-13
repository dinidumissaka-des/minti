# Push changes

Stage all modified files, write a concise commit message based on the diff, commit, push, and open a PR.

Steps:
1. Run `git status` and `git diff` to understand what changed
2. Stage relevant files with `git add` (specific files, not `-A` blindly — skip .env files)
3. Write a commit message: short subject line (≤72 chars), imperative mood, focused on the "why" not the "what". Add `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` trailer.
4. Commit and run `git push` (use `git push -u origin <branch>` if the branch has no upstream yet)
5. If on `main`, skip PR creation and just report the commit hash. Otherwise, check `gh pr list --head <branch>` for an existing open PR:
   - If one exists, just report its URL (nothing to create).
   - If none exists, run `gh pr create` targeting `main` with a title matching the commit subject and a short body summarizing the change, then report the PR URL.
6. Report the commit hash, what was pushed, and the PR URL (if applicable)
