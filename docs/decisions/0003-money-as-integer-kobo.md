# 0003 — Money as integer kobo

**Status:** Accepted
**Date:** 2026-10-24
**PRD:** §10.1, §10.4, RENT-3, RENT-14

## Context

Rent in Nigeria is commonly paid annually in large amounts, allocated across multiple charges, split by commission percentages, and reported in landlord statements the landlord will check by hand. Floating-point money produces ₦0.01 discrepancies that are individually trivial and collectively a dispute. The PRD states it plainly: store naira as integer kobo, do not use floating-point values for money.

## Decision

All monetary amounts are integer kobo, stored in Postgres `bigint`, and manipulated only through `@tenaville/money`.

- No `float`, no `double precision`, no JavaScript `number` arithmetic on amounts that must be exact.
- Percentage calculations (commission, VAT, withholding) return integer kobo with an explicit, documented rounding rule.
- Allocation of one amount across several charges is a single tested function that guarantees the parts sum to the whole.

## Consequences

- Rounding is decided once, in one place, instead of at each call site.
- `bigint` crossing a JSON boundary is a known hazard: amounts are serialised as integers that the client reads as kobo, and formatting to "₦1,250,000.00" happens at the display edge only.
- Cost: every amount needs conversion at input and display. `@tenaville/money` must make the correct path shorter than the incorrect one, or someone will multiply by 100 by hand.

## Alternatives considered

**Postgres `numeric(14,2)`.** Exact in the database, but the value arrives in JavaScript as a string or a lossy number, and the arithmetic then happens in application code anyway — which is where the errors are. Integer kobo keeps one representation end to end.

**A decimal library in application code with `numeric` storage.** Workable, but it adds a dependency to express what an integer already expresses exactly, and the PRD asked for integer minor units.
