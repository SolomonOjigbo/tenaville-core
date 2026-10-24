# Operations

Runbooks and operational policy. Several of these are launch exit criteria rather than nice-to-haves.

| Document | Purpose |
|---|---|
| [Local development](local-development.md) | Getting the stack running |
| [Agency onboarding and cutover](agency-onboarding.md) | Migrating an agency off spreadsheets |
| [Open decisions](open-decisions.md) | PRD §18 questions, tracked to an owner |

## Required before production launch

From PRD §12 and §16.2 — none of these is written yet:

- **Recovery objectives.** Define RPO and RTO, test restores regularly, publish the targets internally. Backup restoration must be tested before launch.
- **Availability target and incident response.** Define both, and a process for communicating planned maintenance.
- **Observability.** Structured logs, error tracking, uptime monitoring, background-job monitoring, alerting.
- **Support channels and response targets** for pilot and launch, plus a status page.
- **Security testing.** Penetration testing and a dependency-update cadence.

Each needs its own runbook here before the pilot exits.
