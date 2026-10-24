# PRD

[Tenaville_Property_Management_PRD_v3.md](Tenaville_Property_Management_PRD_v3.md) is the authoritative scope document. v3 supersedes v2.

Everything in `docs/architecture/`, `docs/requirements/` and `docs/decisions/` derives from it and cites the requirement IDs it implements.

## Changing scope

1. Revise the PRD here and bump its version with a row in its own revision table (§0).
2. Regenerate the traceability matrix and `requirements.json`, then run `pnpm docs:reqs` — CI fails if requirement IDs or priorities drift between the PRD and the matrix.
3. Update any architecture document whose constraints changed, in the same change.
4. If an architecture decision changed, add a new ADR that supersedes the old one. Do not edit an accepted record.

The checker only verifies IDs and priorities. Reworded requirement text will pass silently, so update the matrix summary when wording changes materially.
