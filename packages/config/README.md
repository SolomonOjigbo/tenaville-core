# @tenaville/config

Shared ESLint, TypeScript and Vitest configuration.

## ESLint

`eslint.config.js` carries two rule groups that exist to protect decisions rather than style:

**Module boundaries.** `no-restricted-imports` blocks reaching into another domain module's `domain/` or `infrastructure/`, and blocks any import of the financing module — which is R3 and must not be a dependency of R1 or R2 (PRD §8.12). [ADR 0001](../../docs/decisions/0001-monorepo-modular-monolith.md) notes that module discipline is a convention without a compiler guarantee; this rule is the guarantee.

**Invariants.** `no-restricted-syntax` flags `Math.round`/`floor`/`ceil` — monetary rounding belongs in `@tenaville/money` so the rule is applied once ([ADR 0003](../../docs/decisions/0003-money-as-integer-kobo.md)) — and flags references to `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS and belongs only to migrations and background jobs ([ADR 0002](../../docs/decisions/0002-supabase-postgres-rls.md)).

Both are deliberately blunt. A legitimate use is silenced with an inline disable and a comment saying why, which is exactly the review conversation worth having.

## TypeScript

`tsconfig/base.json` extends the repository root config. `next.json` and `react-native.json` add the DOM and React Native variations.

Strict mode plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are on. These are noisier than default strict, and they are worth it in code that allocates payments across charges.

## Vitest

`fileParallelism` is off: isolation tests share one local Postgres, and parallel runs make failures non-deterministic.
