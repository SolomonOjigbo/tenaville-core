# Properties & units

PRD section 8.2 · requirement prefix `PROP` · first release **R1**

PROP-9 is a hard constraint, not a setting: no public marketplace or search-indexable property record. Unit sheets (PROP-10) are unguessable, expiring, noindex links.

## Owned entities

`Property`, `Unit`, `UnitShareLink`, `PropertyDocument` — see [data model](../../../../../docs/data-model/entities.md).

## Requirements

10 requirements: P0 6 · P1 4 · P2 0. Status is tracked in [the traceability matrix](../../../../../docs/requirements/traceability.md).

| ID      | Pri | Requirement                                                                                                                             |
| ------- | --- | --------------------------------------------------------------------------------------------------------------------------------------- |
| PROP-1  | P0  | Create properties with name/reference, address, state, LGA/area, property type, photos, notes and optional map coordinates              |
| PROP-2  | P0  | Create units with label/reference, type, size/bedrooms where applicable, occupancy status, asking/contracted rent, facilities and notes |
| PROP-3  | P0  | Support statuses such as vacant, occupied, reserved, under maintenance and inactive                                                     |
| PROP-4  | P0  | Import properties and units from spreadsheet templates with row-level validation and error reporting                                    |
| PROP-5  | P0  | Link properties to one landlord; support ownership shares and multiple landlords in a later release                                     |
| PROP-6  | P1  | Support custom fields per property or unit                                                                                              |
| PROP-7  | P1  | Keep an internal vacancy history, including dates vacant/occupied, reason for vacancy and next action                                   |
| PROP-8  | P1  | Attach property-specific operating documents, warranties, manuals and inspection records                                                |
| PROP-9  | P0  | Do not expose property records in a public marketplace or public search index                                                           |
| PROP-10 | P1  | Generate an agency-controlled unit sheet (PDF or private link) that staff can send to a prospect                                        |

## Layout

```
properties/
├── README.md         this file
├── domain/           entities, value objects, invariants — no I/O
├── application/      use cases; the only entry point other modules call
├── infrastructure/   Supabase queries, provider calls, mappers
├── schema/           zod request/response schemas, re-exported to web and mobile
└── __tests__/        unit tests for invariants, integration tests for RLS
```

## Boundary rules

- Other modules call this module through `application/` only — never its tables or `infrastructure/` directly.
- Cross-module reads go through an explicit, typed port. If two modules need each other's internals, the boundary is wrong.
- Every table carries `organisation_id` with RLS enabled (PRD ORG-8).
