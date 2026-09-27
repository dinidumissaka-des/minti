# Implement an approved spec

Implement: $ARGUMENTS (a path under `specs/changes/`)

Steps:
1. Read the spec. If its status is not `Approved`, stop and say so — don't implement a draft.
2. Read the product/design specs it updates, `specs/design/design-system.md` for any UI work, and the code it names.
3. Write the tests first: one test per acceptance criterion that can be checked in `lib/`, in `tests/<area>.test.ts`, named `"<ID>: <criterion in short>"`. Run `npm test` and confirm the new ones fail for the right reason.
4. Build exactly what the spec asks. Put logic a criterion depends on in `lib/` as a pure function. If you find the spec is wrong or incomplete, stop and propose a spec edit instead of improvising.
5. Run `npm run typecheck && npm test && npm run build`. All must pass.
6. Close the loop in the same change:
   - set the change spec to `Status: Shipped`,
   - fold its rules and criteria into `specs/product/<area>.md` (or the design spec),
   - add any new test file to the index in `specs/README.md`.
7. If web source changed, remind that `npm run ios:sync` is needed for the iOS build.
8. Report: criteria covered by tests, criteria left `Verify: manual`, and anything the spec didn't cover.
