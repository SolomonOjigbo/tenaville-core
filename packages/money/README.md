# @tenaville/money

Naira as integer kobo. Every monetary operation in Tenaville goes through here.

> **₦1,250,000.00 is `125_000_000` kobo.** Never a float, never a `number` in arithmetic that must be exact.

See [ADR 0003](../../docs/decisions/0003-money-as-integer-kobo.md) and PRD §10.1.

## Why a package for this

Two reasons, both from the PRD.

**Allocation must lose nothing.** Splitting a payment across charges, or a commission percentage across a statement, produces remainders. Where that remainder goes has to be decided once — in a tested function — not at each call site. A ₦0.01 discrepancy in a landlord statement is a phone call, and a pattern of them is lost trust.

**Rounding is a policy, not an implementation detail.** Commission, VAT on commission and withholding tax on rent (LEDGER-9, LEDGER-10) all round. The rule is documented here and applied everywhere, so a statement reconciles against a receipt.

## Scope

- Construction and parsing from user input (`"1,250,000"`, `"₦1.25m"`, `1250000`) to kobo.
- Formatting for display (`₦1,250,000.00`) and for documents, in WAT-local conventions.
- Addition, subtraction, comparison, and multiplication by a rate with an explicit rounding rule.
- **Allocation**: splitting an amount across n targets such that the parts sum exactly to the whole.
- Guards against the common mistakes: mixing kobo and naira, serialising a `bigint` carelessly, comparing with `==`.

## Not in scope

Currency conversion. Tenaville is NGN-only (PRD §12, Localisation). Designing for multi-currency now would add a dimension to every amount for no present requirement.

## The rounding rule

Still undecided — see [open decisions](../../docs/ops/open-decisions.md). It blocks R1 step 6 (the landlord ledger), because commission calculation cannot ship without it.
