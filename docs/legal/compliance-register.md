# Compliance register

> PRD §11. Every item here requires review by qualified Nigerian legal, privacy or financial-services advisers **before production launch**. This register tracks that review; it is not legal advice and does not substitute for it.

Engineering can build against these constraints now, but several items gate launch rather than development.

| # | Item | Gates | Owner | Status |
|---|---|---|---|---|
| 1 | **Product name** — CAC business-name register, Nigerian trademark search, `.com`/`.ng`/`.com.ng` domains, social handles, app-store listings | Any public use of the name | Founder | Open |
| 2 | **Data protection** — obligations under the Nigeria Data Protection Act: privacy notices, lawful basis, processor agreements, security, breach handling | Production launch | Legal + Eng | Open |
| 3 | **Sensitive identifiers** — what may lawfully be collected, stored or displayed for NIN and BVN | Screening (R2) | Legal | Open |
| 4 | **Tenant screening criteria** — lawful, relevant, explainable criteria; purpose and consent; retention and review | Screening (R2) | Legal + Product | Open |
| 5 | **Client money and deposits** — how caution deposits and rent collected for landlords must be held and accounted for under professional and legal obligations | R1 ledger design | Legal + Accounting | Open |
| 6 | **Agency commission, tax and remittance** — applicable tax treatment; VAT on commission, withholding tax on rent | Tax lines (R2); `TaxRule` off by default until cleared | Tax adviser | Open |
| 7 | **Payments** — virtual accounts and processing supplied by suitably licensed partners; Tenaville holds no customer funds | Payment automation (R2) | Legal + Founder | Open |
| 8 | **Rent financing** — provider authorisation, lending/advertising/referral responsibilities, data sharing, complaint handling | Financing (R3) | Legal | Open |
| 9 | **Consumer transparency for financing** — who discloses cost, eligibility and repayment obligations, and when | Financing (R3) | Legal | Open |
| 10 | **Messaging** — WhatsApp Business policy (approved templates, opt-in); marketing consent separate from operational tenancy messages | R1 comms | Product + Legal | Open |
| 11 | **State tenancy rules** — requirements and notice periods vary by state; defaults must not be presented as legal advice | Notices (R2) | Legal | Open |
| 12 | **Professional claims** — no implication that Tenaville certifies title, verifies ownership, guarantees tenant identity or gives legal advice | All marketing and in-product copy | Product | Open |

## Standing engineering constraints

These follow from the register and are already encoded in [CLAUDE.md](../../CLAUDE.md):

- Collect only the personal data a defined purpose needs; separate operational consent from marketing consent (§10.10).
- Treat NIN and BVN as highly sensitive: prefer a provider's pass/fail result over storing the identifier; mask by default; audit access (SCREEN-15).
- Provide data-subject processes: access, correction, deletion where applicable, retention exceptions (§10.11).
- Apply the same access controls and audit expectations to exports as to on-screen data (§10.14).
- Keep the financing module disabled by default and free of R1/R2 dependencies (§8.12, §16.4).
- Keep tenancy rules, notice periods and screening criteria as agency configuration, never hard-coded defaults presented as correct (§4.2, §11).
- Never present Tenaville as the lender, or a financing approval as rent paid (TENANT-13, FIN-8).

## Retention periods — undecided

PRD open decision 10 asks for retention periods for rejected applications, screening evidence, repair photos and communication history. These are unset. Screening work (R2) cannot ship without them, because SCREEN-11 requires configurable retention and deletion or anonymisation.
