# @tenaville/core

The domain. One module per PRD §8 functional area, each with the same internal shape.

Business rules live here — not in route handlers, not in React components, not in SQL alone.

## Modules

| Module | Prefix | First release |
|---|---|---|
| [org](src/modules/org) | ORG | R1 |
| [properties](src/modules/properties) | PROP | R1 |
| [landlords](src/modules/landlords) | OWN | R1 |
| [leases](src/modules/leases) | LEASE | R1 |
| [rent](src/modules/rent) | RENT | R1 |
| [ledger](src/modules/ledger) | LEDGER | R1 |
| [maintenance](src/modules/maintenance) | MAINT | R1 |
| [tenant-portal](src/modules/tenant-portal) | TENANT | R1 |
| [comms](src/modules/comms) | COMMS | R1 |
| [documents](src/modules/documents) | DOC | R1 |
| [billing](src/modules/billing) | BILL | R1 |
| [migration](src/modules/migration) | MIG | R1 |
| [analytics](src/modules/analytics) | AN | R1 (core reports) |
| [crm](src/modules/crm) | CRM | R2 |
| [appointments](src/modules/appointments) | APPT | R2 |
| [screening](src/modules/screening) | SCREEN | R2 |
| [financing](src/modules/financing) | FIN | R3 |

Each module's README lists its own requirements and owned entities.

## Module shape

```
<module>/
├── domain/           entities, value objects, invariants — no I/O
├── application/      use cases; the only entry point other modules call
├── infrastructure/   Supabase queries, provider calls, mappers
├── schema/           zod request/response schemas, re-exported to web and mobile
└── __tests__/        unit tests for invariants, integration tests for RLS
```

**`domain/` has no I/O.** It is where an invariant — allocations sum to the payment, a statement cannot be issued twice, work above a threshold needs approval — is expressed and unit-tested without a database.

**`application/` is the door.** Other modules, route handlers and server components call use cases here. Nothing else is importable from outside the module, and ESLint enforces it (see `@tenaville/config`).

**`infrastructure/` is replaceable.** Supabase queries and provider calls live here behind the ports the application layer depends on.

**`schema/` is shared.** The zod schema that validates a payment on the web is the same one the mobile app validates against, so a rule cannot be right on one client and wrong on the other.

## Cross-module dependencies

Real and unavoidable: rent feeds ledger, maintenance costs feed ledger, leases generate charges, comms notifies about all of them.

Each such dependency is an explicit, typed port — the consuming module declares what it needs, the providing module's `application/` layer satisfies it. If two modules need each other's internals, the boundary is drawn in the wrong place; move the shared concept rather than widening the door.

Financing (R3) may depend on others. Nothing may depend on financing (PRD §8.12), and ESLint blocks it.
