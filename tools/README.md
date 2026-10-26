# Tools

Repository scripts.

| Script                   | Purpose                                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `check-traceability.mjs` | Verifies the PRD, `docs/requirements/requirements.json` and `docs/requirements/traceability.md` agree, and that every owner module path exists |
| `check-backlog.mjs`      | Verifies the sprint backlog's three files agree with each other and with the PRD, and that no R1 ticket depends on a P1 requirement            |
| `db-verify.sh`           | Applies the migrations, lints the schema and runs the pgTAP suite against a throwaway Postgres container                                       |
| `db-types.sh`            | Regenerates `packages/db` types from the migrations alone                                                                                      |

## check-traceability.mjs

Run with `pnpm docs:reqs`. Runs as its own CI job.

It fails when a requirement is in the PRD but untracked, tracked but no longer in the PRD, carries a different priority in each place, is missing a row in the matrix, or names an owner directory that does not exist.

It deliberately does **not** check requirement wording. Reworded text passes silently, so update the matrix summary when wording changes materially.

The point is that a scope change cannot land quietly. If the PRD gains a requirement, CI asks who owns it before the change merges.

## check-backlog.mjs

Run with `pnpm docs:reqs`, alongside the traceability check.

It fails when `sprint-backlog.csv` and `backlog.json` disagree on a ticket, sprint or point count; when a ticket cites a requirement the PRD does not contain; when a P0 or P1 requirement has no ticket at all; when an R1 ticket depends on a P1 requirement; when a ticket's status contradicts the traceability matrix; or when `sprint-backlog.md` — the document people actually read — disagrees with the CSV on a ticket entry, a per-sprint total or the plan size.

That last check exists because eleven of the prose document's per-sprint totals had silently drifted by the time anyone looked.

What it cannot do is prove that every _clause_ of a requirement is in some ticket's scope. Coverage is checked by requirement id, and a requirement that says three things can be half-built with every id accounted for. Five tickets have been added after the fact for exactly that reason; see the amendments section of the backlog.

## db-verify.sh

Run with `pnpm test:isolation`. Mirrors the CI isolation job.

Spins `supabase/postgres` in Docker, applies every migration, runs `supabase db lint` over the `public` and `app` schemas, applies the seeds, then runs each pgTAP file. It fails on a `not ok`, on a plan mismatch, and on any `ERROR:` in the output — a pgTAP file can otherwise exit 0 with failing assertions.

Use it rather than `supabase start`, which pulls from a rate-limited registry and has been unreliable here.

## db-types.sh

Run with `pnpm db:types`.

Deliberately not `supabase gen types --local`: the local stack has pgTAP installed, so generating from it writes fifty-odd pgTAP functions into the types as though they were application API. This applies only the migrations — no seeds, no test helpers — and reads the schema from that.
