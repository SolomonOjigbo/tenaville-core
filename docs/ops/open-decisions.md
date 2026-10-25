# Open product decisions

PRD §18, tracked to the work each one blocks. Several block R1 implementation, not just R1 polish — those are marked **blocks R1**.

| #   | Decision                                                                                                          | Blocks                                                                                                                                       | Owner                    |
| --- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | Which Nigerian states and agency segments are the first launch focus?                                             | Pilot recruitment                                                                                                                            | Founder                  |
| 2   | Which CRM pipeline stages and appointment types are defaults?                                                     | R2 CRM                                                                                                                                       | Product                  |
| 3   | Which screening templates ship as examples; which checks need third-party integration?                            | R2 screening                                                                                                                                 | Product + Legal          |
| 4   | What maintenance approval thresholds and emergency rules does the pilot need?                                     | R2 maintenance approvals                                                                                                                     | Product                  |
| 5   | Which tenant portal actions are R1 versus R2?                                                                     | **Blocks R1** step 9                                                                                                                         | Product                  |
| 6   | Which metrics are essential for the first portfolio dashboard?                                                    | R2 analytics                                                                                                                                 | Product                  |
| 7   | Which payment provider for virtual accounts, links and reconciliation?                                            | R2 payment automation                                                                                                                        | Founder + Legal          |
| 8   | Which rent-financing providers are properly authorised and commercially suitable?                                 | R3 financing                                                                                                                                 | Founder + Legal          |
| 9   | Is tenant financing in the initial launch market, or deferred until the core is stable?                           | R3 scope                                                                                                                                     | Founder                  |
| 10  | Retention periods for rejected applications, screening evidence, repair photos, communication history             | R2 screening (SCREEN-11 cannot ship without it)                                                                                              | Legal + Product          |
| 11  | Subscription tiers and unit-based price points                                                                    | R1 billing shell → pilot pricing                                                                                                             | Founder                  |
| 12  | Which mobile offline actions are essential at launch?                                                             | **Blocks R1** step 7                                                                                                                         | Product + Eng            |
| 13  | Where do partner virtual accounts settle — agency client account, landlord account, or split — and who contracts? | R2 settlement model (LEDGER-11)                                                                                                              | Founder + Legal          |
| 14  | Is commission recognised on cash received (default) or another basis, and which tax lines apply?                  | **Blocks R1** step 6 (LEDGER-9)                                                                                                              | Accounting + Legal       |
| 15  | Who holds caution deposits in practice, and how do they appear in statements?                                     | **Blocks R1** step 6 (statement presentation). Step 3 models custody as `lease_deposits.custodian`, so both answers work without a migration | Legal + Accounting       |
| 16  | What receipt numbering format do pilot agencies expect (prefix, branch, year)?                                    | **Blocks R1** step 4 (RENT-13)                                                                                                               | Product + pilot agencies |
| 17  | How is identity verified without storing sensitive identifiers (provider and legal basis)?                        | R2 screening (SCREEN-15)                                                                                                                     | Legal + Eng              |
| 18  | Which mobile OS versions are supported at launch?                                                                 | **Blocks R1** step 7 (MOB-9)                                                                                                                 | Eng                      |
| 19  | Which product name is final, after trademark, domain and CAC checks?                                              | Any public use                                                                                                                               | Founder                  |

## Decision gates by sprint

From the [sprint backlog](../requirements/sprint-backlog.md) §5. Each must be resolved before the
sprint that needs it starts — this is the operative schedule for the questions above.

| Before sprint | Decision needed                                                             | Blocks                             |
| ------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| 1             | Technology stack, hosting and domain; start the name, domain and CAC checks | everything                         |
| 4             | Receipt numbering format (prefix, branch, year) agreed with pilot agencies  | TV-024 receipts                    |
| 5             | How caution deposits are held and shown, and the commission basis           | TV-029 deposits, TV-030 commission |
| 7             | WhatsApp, SMS and email providers chosen, with a messaging budget           | messaging tickets                  |
| 10            | Minimum supported iOS and Android versions                                  | mobile tickets                     |
| 14            | Payment partner shortlisted and the settlement model decided                | payment automation                 |
| 18            | Identity-verification approach and legal basis                              | screening tickets                  |
| 19            | Launch-state legal defaults for notices, late fees and rent review          | notices, late fees, rent review    |

Sprint 1 and Sprint 4 gates are overdue relative to the work already done: Sprints 1 to 3 were built
without the stack and hosting decision being recorded anywhere, and Sprint 4 cannot finish without the
receipt numbering format. The rounding rule is not in the backlog's list but blocks the same sprint —
see the engineering decisions below.

## Engineering decisions still open

Not in PRD §18, but needed before the work they touch:

| Decision                                                                                                              | Blocks                                                    | Reference                                                   |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| Are landlord and tenant portal users Supabase Auth users with narrow policies, or a separate `PortalAccount` linkage? | **Blocks R1** step 9                                      | [ADR 0002](../decisions/0002-supabase-postgres-rls.md)      |
| Policy shape that accommodates branch-level scoping without rewriting every policy in R2                              | R1 schema design                                          | [RLS](../architecture/multi-tenancy-and-rls.md)             |
| Background job runner: Supabase scheduled functions, a hosted queue, or Next.js cron routes                           | **Blocks R1** step 10 (reminders) and step 6 (statements) | [ADR 0006](../decisions/0006-next-route-handlers-as-api.md) |
| Rounding rule for commission and tax percentage calculations                                                          | **Blocks R1** step 6                                      | [ADR 0003](../decisions/0003-money-as-integer-kobo.md)      |

## How to close one

Record the answer where it belongs — a PRD revision for scope, an ADR for an architecture choice, a module README for a local rule — then strike the row here with a link. An answer that lives only in a chat thread is not closed.
