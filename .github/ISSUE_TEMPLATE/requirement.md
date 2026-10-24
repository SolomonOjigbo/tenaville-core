---
name: Implement a PRD requirement
about: Work tracked against a requirement ID from PRD v3
labels: requirement
---

**Requirement IDs:** <!-- e.g. RENT-13, RENT-14 -->
**Release:** <!-- R1 / R2 / R3 -->
**Owner module:** <!-- e.g. packages/core/src/modules/rent -->

## Requirement text

<!-- Quote the PRD wording so the acceptance bar is unambiguous. -->

## Acceptance

<!-- What must be true to call this done. Reference §16.2/§16.3/§16.4 exit criteria where one applies. -->

## Invariants this touches

<!-- Delete what does not apply. See CLAUDE.md. -->

- [ ] Money as integer kobo
- [ ] Append-only financial history
- [ ] Client-fund separation
- [ ] Receipt numbering
- [ ] Statement immutability
- [ ] Tenant isolation / RLS
- [ ] Offline sync authority
- [ ] Document authorisation
- [ ] Sensitive identifiers
- [ ] Audit coverage

## Open decisions blocking this

<!-- Link docs/ops/open-decisions.md rows, if any. -->
