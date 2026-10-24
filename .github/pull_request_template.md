## What and why

<!-- Short description. Link the PRD requirement IDs this PR implements, e.g. RENT-13, LEDGER-8. -->

Requirements: <!-- ORG-4, RENT-13 -->

## Checklist

- [ ] Requirement IDs listed above and `docs/requirements/traceability.md` updated
- [ ] New tables are organisation-scoped with RLS enabled and a policy (PRD ORG-8)
- [ ] Money stored as integer kobo; no floats (PRD §10.1)
- [ ] Financial changes are append-only — reversals/adjustments, not updates or deletes (PRD §10.2)
- [ ] Audit events recorded for financial, lease, screening, approval and permission changes (PRD ORG-5)
- [ ] Documents reachable only through authorised, time-limited links (PRD DOC-7)
- [ ] Cross-tenant isolation test added or confirmed still covering this path
- [ ] No sensitive identifiers (NIN/BVN) stored unnecessarily; masked where present (PRD SCREEN-15)
