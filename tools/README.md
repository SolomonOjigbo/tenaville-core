# Tools

Repository scripts.

| Script                   | Purpose                                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `check-traceability.mjs` | Verifies the PRD, `docs/requirements/requirements.json` and `docs/requirements/traceability.md` agree, and that every owner module path exists |

## check-traceability.mjs

Run with `pnpm docs:reqs`. Runs as its own CI job.

It fails when a requirement is in the PRD but untracked, tracked but no longer in the PRD, carries a different priority in each place, is missing a row in the matrix, or names an owner directory that does not exist.

It deliberately does **not** check requirement wording. Reworded text passes silently, so update the matrix summary when wording changes materially.

The point is that a scope change cannot land quietly. If the PRD gains a requirement, CI asks who owns it before the change merges.
