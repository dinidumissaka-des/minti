# Draft a change spec

Write a change spec for: $ARGUMENTS

Do not write or change any code in this command.

Steps:
1. Read `specs/README.md`, `specs/_template.md`, and every `specs/product/` or `specs/design/` file the change touches.
2. Find the next number: the highest `specs/changes/NNNN-*.md` plus one.
3. Create `specs/changes/NNNN-<kebab-slug>.md` from the template with `Status: Draft`.
   - **Problem**: only evidence you can point to (the request, a commit, a bug with real numbers). If you don't have evidence, write `TODO: evidence` — don't invent it.
   - **Rules**: stated so they can be pasted into the product spec.
   - **Acceptance criteria**: continue the area's ID numbering (read the product spec for the highest ID). Given / When / Then. Mark anything that can only be checked in the UI `Verify: manual — <how>`.
   - **Out of scope**: at least one line.
   - If the change contradicts an existing rule, say which one and why it should change.
4. List the open questions you could not answer from the repo.
5. Stop. Report the file path and the open questions. The spec needs approval (`Status: Approved`) before `/implement`.
