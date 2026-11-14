# @tenaville/seed — demo data for staging and investor demos

Three fictional organisations with a year of realistic history, loaded into an
**empty staging project** through the same application layer and RPCs the
product uses. Nothing is inserted around the invariants: receipts are numbered
by `record_payment`, commission and ledger entries are posted by the ledger
triggers, plan limits are enforced by the entitlement triggers, repair
approvals go through `decide_maintenance_approval`. If the seed runs, the
schema's own rules accepted the data.

## What you get

| | Harbourview Property Partners | Garki Gate Estates | Nwosu Family Properties |
|---|---|---|---|
| Shape | Large Lagos agency, 3 branches | Mid-size Abuja agency | Self-managing landlord, PH + Enugu |
| Plan | Growth | Agent | Landlord |
| Staff seats | 12 (+1 pending invite) | 5 | 3 |
| Landlords | 6 (10%, 8%, 7.5%, 12%, flat ₦20k) | 4 (incl. 7% and quarterly) | 1 (no mandate) |
| Properties / units | 12 / 158 | 6 / 62 | 3 / 22 |
| Leases | ~200 (≈140 live) | ~73 (≈53 live) | ~29 (≈18 live) |
| Payments | ~350 | ~105 | ~55 |
| Repair requests | 34 | 16 | 8 |

Every organisation includes: renewals, expiring leases, expired and terminated
tenancies with deposit settlements, draft leases, reserved and under-repair
units, estate service charges, late and partial payers with real arrears,
returned cheques (reversals) with corrected re-payments, bank-confirmed vs
cash-"recorded" payments, landlord remittances on each landlord's own schedule,
issued / reviewed / draft landlord statements, repair requests in every state
(including one awaiting landlord approval, one rejected cost, one approved
over-threshold repair), vendors, message templates and history, tasks, device
sessions, and subscription usage readings with paid and outstanding invoices.

Everything is derived from a seed string (`SEED_RNG`, default
`tenaville-demo-v1`) and "today" in Lagos. Same seed and same day produce
identical rows, so a demo rehearsed on Tuesday is the demo shown on Thursday.
Dates are all relative to today, so the data always looks current.

## Run it

Prerequisites: a Supabase project with all migrations applied
(`supabase db push`) and **no other data in it**.

```bash
# 1. Put the staging project's keys in a gitignored env file, e.g. .env.staging
#    NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 2. Check the guards without writing anything
SEED_ALLOW_HOSTED=yes-this-is-not-production \
SEED_DEMO_PASSWORD='choose-a-long-shared-password' \
  pnpm seed:demo --env-file ../../.env.staging --confirm-project-ref <project-ref> --dry-run

# 3. Seed (drop --dry-run)
```

Local Supabase (`pnpm db:start`): no hosted flags needed, just
`SEED_DEMO_PASSWORD=… pnpm seed:demo --env-file ../../.env.local`.

`--only harbourview|garki|nwosu` seeds one organisation. Expect roughly 10 to
20 minutes against a hosted project (a few thousand round trips).

### Safety

The tool creates logins that share one password, so it refuses by default:

- a hosted URL needs `SEED_ALLOW_HOSTED=yes-this-is-not-production` **and**
  `--confirm-project-ref <ref>` matching the URL;
- refs listed in `SEED_PRODUCTION_REFS` (comma-separated) are never seeded;
- it aborts if any demo organisation already exists, and if the database holds
  any *other* organisation (override: `--allow-existing-data`);
- `SEED_DEMO_PASSWORD` is required and must be 12+ characters.

### Reset

Payments, receipts, ledger and audit rows are append-only with RESTRICT foreign
keys, so no client can delete them. To re-seed, run `sql/reset-demo.sql` as the
`postgres` role in the Supabase SQL editor. It removes only the three demo
organisations, their rows and the seed-created logins (marked
`user_metadata.demo = true`).

## Logins

Shared password = `SEED_DEMO_PASSWORD`. The run prints the full list. Patterns:

| Who | Email |
|---|---|
| Large agency MD / ops / accounts | `md@` / `ops@` / `accounts@harbourview.<domain>` |
| Property managers | `pm.lekki@`, `pm.island@`, `pm.mainland@harbourview.<domain>` |
| Landlord portal | `landlord.fashola@`, `landlord.eze-obi@`, `landlord.ridgeline@harbourview.<domain>` |
| Tenant portal | `tenant1@` … `tenant8@harbourview.<domain>` |
| Mid agency | `md@`, `pm@`, `agent@`, `accounts@`, `caretaker@garki.<domain>` |
| Self-managing landlord | `owner@`, `manager@`, `caretaker@nwosu.<domain>` |

`<domain>` is `SEED_EMAIL_DOMAIN` (default `demo.tenaville.app`). These are
confirmed auth users; no email is ever sent.

## Telling the story

- **Scale and trust (Harbourview, `md@`)**: portfolio of 158 units, collections
  by month, arrears ageing, six landlords on different mandates and
  remittance schedules, issued statements that reconcile to the ledger.
- **Landlord self-service**: sign in as `landlord.fashola@`, see the statement
  and approve the repair that is awaiting approval.
- **Tenant and repair flow**: sign in as `tenant1@`, log a repair; as
  `maintenance@` (Ngozi) acknowledge → assign → cost → complete.
- **Mid-size fit (Garki)**: quarterly remittance, a 7% commercial mandate,
  service charges on estate units, five-seat team on the Agent plan.
- **Smallest customer (Nwosu)**: no commission, owner approves their own
  repairs, three seats on the Landlord plan.
- **Controls**: reverse a payment and watch the ledger append the opposite;
  try adding a fourth staff member to Nwosu and hit the plan limit.

## Known limits

- **Receipts carry today's issue date.** `record_payment` stamps `issued_on`
  itself; payments carry the historical `paid_on`.
- **Repair history is stamped today.** Maintenance RPCs timestamp events with
  `now()` and post repair costs to the ledger on `current_date`, so repair
  timelines and cost ledger entries sit at the seed date, not spread over a year.
- **No documents, photos or uploaded files**: they need Storage objects, which
  this seed does not create. Listings show none.
- **Auth rate limits.** Hosted projects limit sign-ins per IP; the seed waits
  and retries on 429, or raise the limit in Auth settings for the run.
- **Phone numbers are synthetic**, in a sparse block chosen to be unlikely to
  belong to anyone. No provider is wired to staging, so nothing is sent.
- Adding or renaming a plan, enum value or required column can break a step;
  the TypeScript types and `pnpm --filter @tenaville/seed typecheck` catch most.

## Layout

```
src/world/*.ts      blueprints: people, portfolios, mandates, tuning (data, not code)
src/steps/01..06    organisations → portfolio → tenancy → money → maintenance → operations/billing
src/lib/            seeded RNG, calendar maths, pure payment planner (+ tests)
src/identity.ts     auth users + sign-in (replaceable for tests)
sql/reset-demo.sql  clean-slate script
```
