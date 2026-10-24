# 0007 — No public marketplace surface

**Status:** Accepted
**Date:** 2026-10-24
**PRD:** §1, §4.2, §6 (explicit exclusion), PROP-9, PROP-10, CRM preamble, risk table ("scope grows too quickly")

## Context

The PRD states repeatedly and in several places that Tenaville is not a public property marketplace: no public property-search portal, no marketplace listings, no listing syndication, no lead selling. It is the product's clearest boundary, and the risk table names scope growth as a launch-delay risk.

Marketplace features arrive by accident rather than by decision: a shareable unit link becomes an indexable page, a vacancy list becomes a public page, and the product acquires a second business with its own legal and moderation obligations.

## Decision

The codebase has no route that serves a property or unit record to an unauthenticated visitor.

- Internal property, unit and vacancy records exist — management requires them. They are never exposed publicly or to a search index (PROP-9).
- Agency-controlled unit sheets (PROP-10, R2) are the only outward artefact: unguessable links, expiring, `noindex`/`nofollow`, showing only the fields the agency selects, generated per prospect.
- CRM is an internal pipeline. No lead marketplace, no lead selling (§8.8 preamble).
- Any future agency-controlled vacancy page requires separate approval and must not become a Tenaville public marketplace (§6).

## Consequences

- No SEO surface, no public-content moderation, no listing-quality obligations, no fair-housing-style exposure from a public search ranking.
- Agents can still send a unit to a prospect — the workflow the marketplace would have served — without the product acquiring one.
- Cost: unit sheets need real link hygiene (unguessable tokens, expiry, revocation, `noindex`, no referrer leakage). A sloppy implementation is a public listing page with extra steps.
- A reviewer can check this boundary mechanically: a new unauthenticated route that renders unit data is a red flag in review.

## Alternatives considered

**A minimal public vacancy page per agency.** Rejected for now. It is the PRD's own conditional exclusion in §6 — permitted only with separate approval — and it is the exact point where scope starts to grow.

**Public listings as a growth channel.** Rejected: a different product with different obligations, and §4.2 names it a non-goal.
