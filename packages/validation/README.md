# @tenaville/validation

Zod schemas shared by `apps/web`, `apps/mobile` and the route handlers between them.

## Why shared

The mobile app captures payments offline and syncs them later (PRD MOB-3). If the device validates a payment differently from the server, the mismatch surfaces as a failed sync hours after the agent left the property — and the agent has already given the tenant a receipt.

One schema, imported by both, removes that class of bug.

## Contents

- **Nigeria-first primitives**: phone numbers (`+234` and local formats), states and LGAs, addresses, NIN and BVN shapes where lawfully collected and always masked in output (PRD SCREEN-15, §12 Localisation).
- **Money input**: parses user input to kobo via `@tenaville/money`, so a schema cannot accept an amount the money package would reject.
- **Date handling**: contractual dates as calendar dates, event timestamps as instants — the distinction in PRD §10.6, enforced at the parse boundary rather than hoped for.
- **Per-module request and response schemas**, re-exported from each module's `schema/` directory.

## Rules

- A route handler parses its input with a schema here before calling a use case. An unparsed request body does not reach `@tenaville/core`.
- Error messages are user-facing. They appear in forms the agent reads on a phone in the field, so "Phone number must start with 0 or +234" beats "Invalid format".
- Schemas describe the shape of a request, not business rules. "This amount is a valid naira amount" belongs here; "this payment exceeds the outstanding balance" belongs in the domain.
