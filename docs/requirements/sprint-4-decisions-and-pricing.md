# Tenaville: Sprint 4 Decisions and Pricing Plan

**Decision record and proposal** | Status: for your approval | Based on PRD v3 and the R1/R2 backlog

---

## 1. Summary

| Item                  | Proposed decision                                                                                                                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Receipt number format | `{prefix}-{branch code if used}-{year}-{sequence}`, for example `R-2026-00418`. The sequence restarts each year, per branch. Numbers are never reused, and voided receipts keep theirs    |
| Commission rounding   | Round half up to the nearest kobo, per receipt, on the commissionable part of each payment. Rates are stored in basis points. A reversal negates the stored amount and never recalculates |
| Gapless allocation    | A counter row per organisation, branch and year, incremented in the same database transaction that creates the receipt. No database sequences, no drafts that consume numbers             |
| Free plan             | One property, up to 10 units, 2 users, manual WhatsApp sharing. Enough for a landlord to run one property end to end                                                                      |
| Paid plans            | Landlord ₦9,999, Agent ₦33,999, Growth ₦92,999 per month, exclusive of VAT, plus Enterprise. Each covers a unit band with a per-unit charge above it, capped at the next tier's price     |
| Annual billing        | Paid in advance at a graduated discount: 10% Landlord, 12% Agent, 15% Growth. Nigerian rent is collected annually, so annual billing matches how the money actually moves                 |
| Trial                 | 30 days with Growth features, no card needed, once per organisation                                                                                                                       |

**A note on ticket numbers — resolved.** This document was written against the backlog as supplied, which ends at TV-142. Four tickets have since been added, so TV-144 does exist:

| Ticket | Sprint | Why it was raised                                                                                                                                                                                                                       |
| ------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TV-143 | 1      | Staff invitations. ORG-2 requires them and no ticket covered that clause. Built.                                                                                                                                                        |
| TV-144 | 4      | The gapless receipt number allocator — exactly the mechanism section 2.3 specifies. Raised because RENT-13 requires sequential numbers and §16.2 requires no gaps, while TV-024's acceptance criteria tested only uniqueness and reuse. |
| TV-145 | 20     | The four conditional maintenance statuses.                                                                                                                                                                                              |
| TV-146 | 8      | Administrator-configured maintenance transitions.                                                                                                                                                                                       |

So section 2.3 and TV-144 are the same decision reached independently, which is a good sign for both. TV-024's acceptance criteria were already amended to require no gaps. Payment-to-charge allocation integrity (TV-023) is covered in 2.3 as well, and the database already enforces integer kobo throughout.

---

## 2. Sprint 4 decisions

### 2.1 Receipt numbering (RENT-13, TV-024)

**Requirements we must meet:** sequential, per branch, voided numbers retained, never reused. Your pilot agencies are single-office, so branch support must work later without disturbing the first agencies.

**Decision**

| Rule              | Detail                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Format            | `{prefix}-{branch code}-{year}-{sequence}`. The branch segment appears only for branches that have a code. Single-office organisations get `R-2026-00418`                                                    |
| Prefix            | One to five letters, default `R`, chosen by the agency. **Locked after the first receipt is issued** so numbers stay consistent                                                                              |
| Branch code       | Two to four letters, unique within the organisation. Adding a second branch later does not change the first branch's numbers. The new branch gets for example `R-IKJ-2026-00001`                             |
| Sequence          | Minimum five digits, growing past 99999 naturally. Scope is organisation + branch + year, restarting at 1 each January                                                                                       |
| Year              | The year of the **issue date** in West Africa Time, not the payment date. A payment dated 31 December that syncs on 2 January receives next year's number. The payment date still prints on the receipt      |
| Uniqueness        | Database constraint on organisation + receipt number, and on organisation + branch + year + sequence                                                                                                         |
| Void and reversal | The receipt stays, marked VOID or REVERSED with reason, user and time. Its number is never reused. A corrected receipt gets a new number and shows 'Replaces R-2026-00418'                                   |
| Drafts            | Drafts do not consume numbers. A number is assigned only when the receipt is issued                                                                                                                          |
| Offline receipts  | A provisional receipt shows 'PENDING SYNC' and a device reference such as `P-7F3A-0012`. It is **not** part of the official sequence. The server assigns the official number on sync and notifies the tenant |
| Receipt contents  | Number, organisation, date, tenant, unit, amount, method, reference, recorded by, status and a verification link                                                                                             |

**Why include the year:** short numbers that restart each year are easier to quote over WhatsApp and match how agencies already think about their books. Because the year is inside the number, the same sequence value never appears twice.

**Alternatives rejected:** one continuous number with no year (grows long, harder to read aloud); a separate sequence per user or device (creates gaps and confusion); letting agencies edit the prefix at any time (breaks continuity).

### 2.2 Commission rounding (LEDGER-9, TV-028)

**Decision**

1. **Currency unit:** all amounts are integer kobo.
2. **Rate:** stored as an integer in basis points. 10% is 1000, 7.5% is 750, 0.25% is 25.
3. **Formula:** `commission = (base_kobo * rate_bps + 5000) / 10000` using integer division. That is **round half up to the nearest kobo**.
4. **When:** calculated once for each receipt, on the portion of the payment that was allocated to commissionable charges (normally rent). Deposits, service charges and other items are commissionable only if the mandate says so.
5. **Stored, not recomputed:** the result is written to the ledger as its own entry. A reversal negates that stored entry. If a payment is corrected, reverse the payment and enter the corrected one so commission is recalculated cleanly.
6. **Flat-fee mandates:** no rounding is needed because the fee is already in kobo.
7. **Statements:** show commission per receipt line. The statement total is the sum of the lines, so it can differ from 'total rent x rate' by a few kobo. Add a short note on the statement explaining this.
8. **Arithmetic safety:** do the multiplication in a 64-bit or arbitrary-precision type. In TypeScript use BigInt, or do it in the database. Never use floating point.

**Worked examples** (these become unit tests)

| Rent received | Rate           | Calculation                                                    | Commission  |
| ------------- | -------------- | -------------------------------------------------------------- | ----------- |
| ₦1,200,000.00 | 10% (1000 bps) | 120,000,000 x 1000 / 10000                                     | ₦120,000.00 |
| ₦333,333.33   | 7.5% (750 bps) | 33,333,333 x 750 = 24,999,999,750, plus 5000, divided by 10000 | ₦25,000.00  |
| ₦150,000.55   | 5% (500 bps)   | 15,000,055 x 500 = 7,500,027,500, plus 5000, divided by 10000  | ₦7,500.03   |
| ₦0.05         | 10% (1000 bps) | 5 x 1000 = 5000, an exact half kobo, rounds up                 | ₦0.01       |

**Why half up per receipt:** it is easy to explain to agents and landlords, it matches how receipts are listed on a statement, and each figure can be traced to one payment. Bankers' rounding removes a tiny bias but is harder to explain. Exact ties are rare at basis-point precision, so the bias is negligible.

### 2.3 Gapless allocation mechanism (TV-024)

**Why not a database sequence:** `nextval` is not rolled back with a failed transaction, so a failed receipt would burn a number and leave a gap. Gaps look like missing receipts in an audit.

**Decision: transactional counter row**

```sql
INSERT INTO receipt_counters (org_id, branch_id, year, last_number)
VALUES ($1, $2, $3, 1)
ON CONFLICT (org_id, branch_id, year)
DO UPDATE SET last_number = receipt_counters.last_number + 1
RETURNING last_number;
```

Run this **inside the same transaction** that inserts the payment, allocations and receipt. If anything fails, the whole transaction rolls back, including the counter, so no number is lost.

**Rules that make it safe**

- Take the counter lock **last**, just before commit, so the lock is held briefly and deadlocks with other rows are avoided.
- Generate the PDF **after** commit in a background job. Never hold the counter lock while rendering.
- Store a client-generated idempotency key (a UUID) on the receipt. A repeated sync returns the same receipt number instead of issuing another.
- Receipts are append-only: a database trigger blocks deleting a receipt or changing its number.
- The counter table has the organisation key and a Row-Level Security policy like every other table.
- Contention is acceptable: one agency issues a few receipts a minute, and the lock is per organisation, branch and year.

**Payment allocation integrity (TV-023).** In the same transaction, a deferred database check must confirm that the sum of allocations equals the payment amount. Default order is oldest charge first. Any excess becomes a tenant credit entry so the totals always tie. All values are integer kobo, so there is no rounding in allocation.

**Tests that prove it**

1. 50 concurrent receipt issues in one scope produce exactly 1 to 50 with no duplicates.
2. Force a failure after the number is assigned: no number is consumed.
3. Replay the same sync batch five times: one receipt, one number.
4. Void a receipt and issue a replacement: the old number remains, the new number is next.
5. A nightly check confirms the highest sequence equals the receipt count for every scope, and alerts on any difference.
6. The year rollover test at midnight West Africa Time.

### 2.4 Ticket updates

- **TV-023 allocation engine:** add 'allocations always sum to the payment, enforced by a database check at commit'.
- **TV-024 receipts:** replace the acceptance line with the format, locking, year, void and replacement rules above, plus the six tests.
- **TV-028 commission:** add the formula, basis-point storage, the four worked examples as tests, and 'reversals negate stored amounts'.
- **TV-064 provisional receipts:** use the `P-` device reference and confirm provisional numbers never enter the official sequence.

### 2.5 Confirm with pilot agencies

1. Is a prefix plus year plus number acceptable, or do they prefer a pure running number?
2. Is commission on cash received the right basis, and is half-up rounding acceptable?
3. Do they want old paper receipt books continued by starting the sequence at a chosen number (a starting-number setting is cheap to add)?

---

## 3. Free and paid plans

### 3.1 Principles

1. **The free plan must run one property properly.** A landlord with one building and its tenants should never need to pay to do the basics.
2. **Limit scale, not safety.** Property, unit and user counts are the main limits. Two-factor authentication, audit records and full data export are never paywalled.
3. **Charge for automation and for managing other people's money.** Automated messaging, multi-landlord ledgers, commission and statements, CRM and analytics are paid.
4. **Control cost.** Messages that cost us money (automated WhatsApp and SMS) are paid or metered. A free WhatsApp share button costs nothing.
5. **Never hold data hostage.** Over-limit data stays visible and exportable.

### 3.2 What the free plan includes

One property with up to 10 units, which covers a typical block of flats or compound. A landlord can:

- Add the property, units, tenants and leases, and get a generated rent schedule
- Record payments, handle part payments and overpayments, and issue numbered PDF receipts
- Share receipts and reminders on WhatsApp with one tap (opens WhatsApp on their phone, no automated sending)
- See rent roll, arrears ageing and lease expiries, with in-app and email alerts
- Track caution deposits, renewals and move-out
- Log maintenance requests with photos and a vendor list
- Give tenants a link to view dues and receipts and report repairs
- Use the mobile app, including offline recording
- Import from a spreadsheet and export everything at any time
- Use two-factor authentication and a 90-day audit history

Free-plan limits: 1 property, 10 units, 2 users (owner and caretaker), 200 MB storage, no automated WhatsApp or SMS, a 'Sent with Tenaville' line on receipts, and 4 standard reports.

### 3.3 Plans and prices

Prices are per month in naira, **exclusive of VAT at 7.5%**. Annual billing is
paid in advance and discounted; the discount grows with the commitment.

|                                      | Free                          | Landlord                     | Agent                           | Growth                           | Enterprise       |
| ------------------------------------ | ----------------------------- | ---------------------------- | ------------------------------- | -------------------------------- | ---------------- |
| Who it is for                        | One property owner            | Owners with a few properties | Agencies managing for landlords | Larger agencies, several offices | Large portfolios |
| **Price per month**                  | ₦0                            | **₦9,999**                   | **₦33,999**                     | **₦92,999**                      | Custom           |
| **Annual, paid in advance**          | ₦0                            | **₦107,900**                 | **₦358,999**                    | **₦948,999**                     | Custom           |
| **Annual discount**                  | —                             | **10%**                      | **12%**                         | **15%**                          | Negotiated       |
| Effective months paid                | —                             | 10.8                         | 10.6                            | 10.2                             | —                |
| Monthly inc. VAT                     | ₦0                            | ₦10,749                      | ₦36,549                         | ₦99,974                          | Custom           |
| Units included                       | 10                            | 30                           | 100                             | 350                              | Custom           |
| Properties                           | 1                             | 5                            | Unlimited                       | Unlimited                        | Unlimited        |
| Users                                | 2                             | 3                            | 5                               | 15                               | Custom           |
| Extra user                           | Not available                 | ₦2,500                       | ₦2,500                          | ₦2,500                           | Custom           |
| Per extra unit                       | Not available                 | ₦300                         | ₦275                            | ₦230                             | Custom           |
| Storage                              | 200 MB                        | 2 GB                         | 10 GB                           | 50 GB                            | Custom           |
| Automated WhatsApp and SMS per month | None (manual share unlimited) | 150                          | 500                             | 1,750                            | Custom           |

Every paid price moved by the same factor, about 1.54, so the shape of the
ladder is unchanged: ₦333 per included unit on Landlord, ₦340 on Agent and
₦266 on Growth. Larger portfolios still pay less per unit, and Landlord and
Agent remain near parity so that an owner is not penalised for being small.

**Why the annual discount is graduated.** This is the part of the pricing that
is specifically Nigerian. Residential rent here is commonly paid annually in
advance — the lease schedule in this product defaults to annual for that
reason — so an agency's commission arrives in lumps when tenancies fall due,
not evenly across the year. Monthly billing asks for money in the months when
nothing has been collected. Annual billing matches how the money actually
moves, so it is worth paying for: 10% at Landlord, 12% at Agent, 15% at
Growth, where the cash-flow benefit to both sides is largest.

**On what this changes.** The previous proposal billed annually at ten times
the monthly price, a 16.7% discount. Two things move at once here: the base
price rises about 54%, and the annual discount narrows. A Landlord paying
annually goes from ₦65,000 to ₦107,900 — a 66% increase, not 54%. That should
be said plainly to anyone already quoted the old numbers, and it argues for
honouring old pricing for any pilot agency already in conversation.

**Inflation.** Naira prices do not hold their meaning for long. Publish that
prices are reviewed annually, that existing subscribers get 60 days' notice of
a change, and that an annual prepayment fixes the price for its term. The last
of those is a further reason to prefer annual, and it is a real benefit rather
than a sales line.

### 3.4 The hybrid per-unit charge

Each plan has a base price covering its included units. Units above the band
are billed at the plan's per-unit rate. **The overage is capped at the next
plan's price**, so a bill never exceeds what the next tier would cost and
nobody is punished for growing.

| Example                         | Calculation                            | Monthly bill |
| ------------------------------- | -------------------------------------- | ------------ |
| Landlord with 34 units          | ₦9,999 + 4 × ₦300                      | ₦11,199      |
| Agency with 140 units on Agent  | ₦33,999 + 40 × ₦275                    | ₦44,999      |
| Agency with 420 units on Growth | ₦92,999 + 70 × ₦230                    | ₦109,099     |
| Agency with 320 units on Agent  | ₦33,999 + 220 × ₦275 = ₦94,499, capped | ₦92,999      |

The cap binds at 110 units on Landlord and 314 units on Agent. At those points
the next tier costs the same and offers more, so the upgrade prompt should
appear well before them — at 80% of the band, as section 3.7 says.

**What counts as a unit:** every active unit, including vacant ones. Archived
units do not count. Bill on the count at the end of the billing period, with a
3-day grace so a short-lived import does not inflate the bill. Show a warning
at 80% and 100% of the band.

### 3.4a Does an agency earn enough to pay this?

Unit count is a proxy for revenue, and in Nigeria it is a weak one: the same
hundred units earns an agency ten times more in Ikoyi than in a secondary
city. The test that matters is the subscription as a share of the commission
actually collected, at 10% of annual rent.

| Tier   | Units | Average annual rent | Rent collected | Commission at 10% | Annual subscription | Share of commission |
| ------ | ----- | ------------------- | -------------- | ----------------- | ------------------- | ------------------- |
| Agent  | 100   | ₦700,000            | ₦70,000,000    | ₦7,000,000        | ₦358,999            | **5.1%**            |
| Agent  | 100   | ₦400,000            | ₦40,000,000    | ₦4,000,000        | ₦358,999            | **9.0%**            |
| Growth | 350   | ₦700,000            | ₦245,000,000   | ₦24,500,000       | ₦948,999            | **3.9%**            |
| Growth | 350   | ₦400,000            | ₦140,000,000   | ₦14,000,000       | ₦948,999            | **6.8%**            |

For a landlord the comparison is to rent received rather than commission, and
it is comfortable at any plausible rent: 30 units at ₦600,000 is ₦18m a year
against a ₦107,900 subscription, or **0.6%**.

**The finding that should change something.** At 5% of commission the Agent
tier is easy to justify. At 9% it is not — and 9% is what an agency managing a
hundred units of ₦400,000 stock would pay. That is not an edge case; it is
most of the market outside prime Lagos and Abuja. The per-unit model is
regressive against low-value stock, and the increase makes it more so.

Three ways to answer it, in order of how much they cost to build:

1. **Validate first.** Put the ₦400,000-rent agency in front of the pricing
   question explicitly during the pilot. If they balk, the model is wrong, not
   the number.
2. **Widen the Agent band.** Raising included units from 100 to 150 drops that
   agency to 6% without touching the headline price.
3. **Price on rent under management rather than units.** A basis-point charge
   on collections tracks an agency's ability to pay exactly, and it is what
   commission itself does. It is a larger change and would need its own
   decision, but it is the structurally correct answer if the pilot shows the
   per-unit model straining.

Do not pick 2 or 3 before the pilot has produced numbers. The point of
recording this is that the question gets asked, not that it gets answered now.

### 3.5 Feature matrix

R2 features are marked (R2) and become available when they ship.

**Portfolio and tenancy**

| Feature                                                         | Free   | Landlord | Agent           | Growth          |
| --------------------------------------------------------------- | ------ | -------- | --------------- | --------------- |
| Properties and units                                            | 1 / 10 | 5 / 30   | Unlimited / 100 | Unlimited / 350 |
| Tenants, leases, rent schedules, renewals, move-in and move-out | Yes    | Yes      | Yes             | Yes             |
| Caution deposit tracking                                        | Yes    | Yes      | Yes             | Yes             |
| Spreadsheet import with dry run                                 | Yes    | Yes      | Yes             | Yes             |
| Co-tenants, guarantors, rent review (R2)                        | No     | Yes      | Yes             | Yes             |
| Notices and letters from templates (R2)                         | No     | Yes      | Yes             | Yes             |
| Custom fields, vacancy history (R2)                             | No     | Yes      | Yes             | Yes             |
| Shareable unit sheets (R2)                                      | No     | Yes      | Yes             | Yes             |

**Money**

| Feature                                                                 | Free                | Landlord      | Agent         | Growth        |
| ----------------------------------------------------------------------- | ------------------- | ------------- | ------------- | ------------- |
| Record payments, allocation, reversals, cash-up                         | Yes                 | Yes           | Yes           | Yes           |
| Numbered receipts (PDF and link)                                        | With Tenaville line | Your branding | Your branding | Your branding |
| Arrears ageing and rent roll                                            | Yes                 | Yes           | Yes           | Yes           |
| Manual WhatsApp share of receipts and reminders                         | Yes                 | Yes           | Yes           | Yes           |
| Automated reminders and receipt delivery                                | No                  | Yes           | Yes           | Yes           |
| Late fee rules (R2)                                                     | No                  | Yes           | Yes           | Yes           |
| Virtual accounts, payment links, auto-matching (R2; fees to be decided) | No                  | Yes           | Yes           | Yes           |
| Scheduled remittance runs (R2)                                          | No                  | No            | Yes           | Yes           |

**Landlord ledger for agencies**

| Feature                                               | Free | Landlord | Agent | Growth |
| ----------------------------------------------------- | ---- | -------- | ----- | ------ |
| Simple income and cost summary for your own property  | Yes  | Yes      | Yes   | Yes    |
| Multiple landlords, mandates, commission              | No   | No       | Yes   | Yes    |
| Landlord ledger, statements, remittances              | No   | No       | Yes   | Yes    |
| Landlord portal                                       | No   | No       | Yes   | Yes    |
| Branded statements, tax lines, accounting export (R2) | No   | No       | Yes   | Yes    |

**Maintenance**

| Feature                                                               | Free | Landlord | Agent | Growth |
| --------------------------------------------------------------------- | ---- | -------- | ----- | ------ |
| Requests, statuses, photos, assignment, vendor list                   | Yes  | Yes      | Yes   | Yes    |
| Repair costs and charging the right payer                             | No   | Yes      | Yes   | Yes    |
| Inspections on mobile (R2)                                            | No   | Yes      | Yes   | Yes    |
| Quotes, approvals, work orders, preventive schedules, escalation (R2) | No   | No       | No    | Yes    |

**Leasing growth (R2)**

| Feature                       | Free | Landlord | Agent | Growth |
| ----------------------------- | ---- | -------- | ----- | ------ |
| CRM pipeline and follow-ups   | No   | No       | No    | Yes    |
| Appointments and viewings     | No   | No       | No    | Yes    |
| Configurable tenant screening | No   | No       | No    | Yes    |

**Team, security and reporting**

| Feature                                     | Free                | Landlord        | Agent                        | Growth                        |
| ------------------------------------------- | ------------------- | --------------- | ---------------------------- | ----------------------------- |
| Two-factor authentication, full data export | Yes                 | Yes             | Yes                          | Yes                           |
| Roles and scoped access                     | Owner and caretaker | Basic roles     | Full roles                   | Full roles                    |
| Audit history visible                       | 90 days             | 1 year          | Unlimited                    | Unlimited                     |
| Branches (R2)                               | No                  | No              | No                           | Yes                           |
| Core reports with export                    | 4 reports           | Full set        | Full set                     | Full set                      |
| Dashboards (R2)                             | No                  | Owner dashboard | Collections, lease, landlord | All, including CRM            |
| Staff mobile app with offline mode          | Yes                 | Yes             | Yes                          | Yes                           |
| Support                                     | Help centre, email  | Email           | Priority email, WhatsApp     | Priority plus onboarding call |

### 3.6 Free trial

**Recommendation: 30 days, not 14.** Agencies only see the real value when they finish a month-end: statements, remittances and arrears. Two weeks usually ends before that.

- **Who gets it:** every new organisation, **once**, with a verified phone number. No card needed, because bank transfer is common.
- **What they get:** Growth features and limits for 30 days.
- **Entry flows:** someone who says they manage for other people starts the Growth trial automatically. Someone who manages their own single property starts on Free and can start the trial whenever they want to try a paid feature.
- **Reminders:** at day 20, day 27 and on the last day, plus an in-app countdown.
- **Lever:** one 14-day extension on request if the agency has imported data but not yet produced a statement.
- **After the trial:** a 7-day grace period (matches PRD BILL-3), then the account moves to Free limits unless they subscribe.

### 3.7 Limits, downgrades and data safety

- At 80% and 100% of a limit, show a clear prompt with the upgrade price.
- **Over the Free limit after a trial:** the owner chooses which property (up to 10 units) stays active. The other properties become **read-only**: viewable, printable and exportable, but no new payments, leases or messages. Nothing is deleted.
- Upgrading restores access immediately.
- Landlord ledger data created during a trial stays viewable in read-only mode after downgrade.
- Reminders for locked properties stop, with a clear note to the owner.

### 3.8 Abuse and cost controls

- The Free plan has no multi-landlord ledger, commission or statements, so an agency cannot run clients' money on free accounts.
- One free organisation and one trial per verified phone number, with device checks added later if needed.
- Free receipts carry the Tenaville line. It costs nothing and helps adoption.
- Automated messages are metered, with warnings before the monthly allowance runs out.
- Review free-plan cost per active user monthly: hosting, storage, support contact rate.

### 3.9 Benchmark and what to validate

One local reference: a Nigerian property management product lists a Free
Forever plan, a Basic plan at ₦15,000 per month and a Premium plan at ₦99,000
per month. That is one data point from a directory listing, not a market
study, and the limits behind those plans are unknown.

**The increase changes where we sit against it.** Before, every tier
undercut that competitor. Now:

| Our tier | Our price                  | Their comparable          | Position                     |
| -------- | -------------------------- | ------------------------- | ---------------------------- |
| Landlord | ₦9,999                     | Basic ₦15,000             | Still below                  |
| Agent    | ₦33,999                    | Between Basic and Premium | At market                    |
| Growth   | ₦92,999 (₦99,974 inc. VAT) | Premium ₦99,000           | **Level, once VAT is added** |

Growth inclusive of VAT is ₦99,974 against their ₦99,000. We are no longer the
cheaper option at the top of the range; we are the same price. That is a
defensible position only if the product is visibly better for a Nigerian
agency — the landlord ledger, the offline mobile app and the gapless receipt
numbering are the arguments — but it is a different sales conversation from
undercutting, and whoever sells this should know that before the first call.

Validate before publishing:

1. **Willingness to pay**, by tier, using the four-question method: what feels
   too cheap, fair, expensive, and too expensive. Five to ten pilot agencies
   and landlords.
2. **The low-rent agency specifically** (section 3.4a). One hundred units at
   ₦400,000 is the case the model strains against.
3. **Message cost.** Confirm the provider's per-message price and adjust the
   allowances; they are placeholders.
4. **VAT.** Whether Tenaville must charge it depends on Tenaville's own
   registration and turnover, not the customer's. Prices here are quoted
   exclusive and shown inclusive; confirm with an adviser before publishing,
   as PRD §11 requires for tax treatment generally.
5. **Payment method.** Bank transfer dominates over cards here. An annual
   invoice paid by transfer needs to be as easy as a card subscription, or the
   annual discount will not be taken up.
6. **Anchoring on the old numbers.** Anyone already quoted ₦6,500 should be
   honoured at it for a term. A 66% rise on an annual Landlord plan is not a
   rounding adjustment.
7. **Conversion and support load**, tracked from day one as before.

### 3.10 Changes to the PRD and backlog

**PRD:** rewrite BILL-1 (a Free plan plus a 30-day trial, then paid plans with a base price and per-unit overage), BILL-3 (read-only locking instead of restriction) and BILL-4. Add entitlement checks to every module that has a limit.

**New backlog tickets.** Raised as TV-147 to TV-153, continuing from the
TV-143 to TV-146 already added. The amendment table in
[sprint-backlog.md](sprint-backlog.md) carries the reasoning for each.

| Ticket | Points | Sprint | What                                                                                                 |
| ------ | ------ | ------ | ---------------------------------------------------------------------------------------------------- |
| TV-147 | 5      | 3      | Plan entitlements: limits and feature flags enforced in the API and the UI                           |
| TV-148 | 5      | 5      | Usage metering: active units, properties, users, storage and messages, with 80% and 100% warnings    |
| TV-149 | 3      | 7      | WhatsApp click-to-chat sharing for receipts and reminders, the free plan's sharing route             |
| TV-150 | 2      | 6      | Receipt and statement footer: the Tenaville line on Free, agency branding on paid plans              |
| TV-151 | 5      | 9      | Trial lifecycle: start, reminders, expiry, 7-day grace, no card                                      |
| TV-152 | 5      | 10     | Downgrade to Free: choose the active property, read-only locking, restore on upgrade                 |
| TV-153 | 8      | 12     | Hybrid billing: base plan, per-unit overage with the cap, and annual plans at the graduated discount |

That is 36 points, a little more than one sprint. Three consequences worth
stating plainly:

- **TV-147 is 5 points, not the 8 first estimated**, because the plan
  definitions and their limit columns landed with this decision as reference
  data in a migration. What remains is the enforcement layer, and the limits it
  reads are already in the database and covered by tests.
- **TV-067 and TV-068 shrank by 6 points between them.** They were umbrella
  tickets covering plans, trial, gateway, limits, grace and the no-deletion
  guarantee in 13 points; TV-147, TV-148, TV-151, TV-152 and TV-153 now carry
  most of that. Leaving them untouched would have counted the same work twice.
- **Trial lifecycle and downgrade do not wait for Sprint 12.** TV-151 needs the
  messaging stack (Sprint 7) and TV-153's arithmetic needs the metering
  (Sprint 5), so the two land in Sprints 9 and 10, where they sit behind their
  dependencies and inside the plan's 28 to 34 point range. Sprint 12 keeps the
  gateway and the billing arithmetic.

Sprint 3 is already built, so TV-147 lands as soon as a limit first needs
enforcing rather than retroactively.

**Not yet done, and not safe to do silently:** the PRD rewrites above change
what BILL-1, BILL-3 and BILL-4 promise. The PRD is the scope source of truth,
so those edits need the same sign-off as any other scope change; until then the
traceability notes record the gap between the shipped schema and the PRD text.

**Already done, which this document predates:** plans and subscriptions exist
in the schema with prices in integer kobo, the trial starts automatically at
signup, and BILL-4's rule that unpaid subscriptions never delete customer data
is enforced by the absence of any cascade and recorded as a table comment.

---

## 4. What changed in this revision

| Change         | Before                        | After                                                                       |
| -------------- | ----------------------------- | --------------------------------------------------------------------------- |
| Landlord       | ₦6,500                        | ₦9,999                                                                      |
| Agent          | ₦22,000                       | ₦33,999                                                                     |
| Growth         | ₦60,000                       | ₦92,999                                                                     |
| Per extra unit | ₦200 / ₦180 / ₦150            | ₦300 / ₦275 / ₦230                                                          |
| Extra user     | ₦1,500                        | ₦2,500                                                                      |
| Annual billing | 10× monthly, a 16.7% discount | Graduated 10% / 12% / 15%                                                   |
| VAT            | "confirm VAT treatment"       | Quoted exclusive, shown inclusive at 7.5%, still to confirm with an adviser |

Every paid price moved by the same factor, about 1.54, so the ladder keeps its
shape. The annual discount narrowed at the same time, which means an annual
Landlord subscription rises 66% rather than 54% — the one number most likely
to surprise someone already quoted the old price.

Added in review: the commission-affordability test in 3.4a and the finding it
produces, the repositioning against the local benchmark in 3.9, an inflation
and price-review commitment, and real ticket ids throughout.

Unchanged: the free plan, the trial, the downgrade and data-safety rules, the
feature matrix and all of section 2's Sprint 4 decisions.
