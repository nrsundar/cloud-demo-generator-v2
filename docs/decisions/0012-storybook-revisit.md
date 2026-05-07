# ADR-0012 — Storybook for `GenNode` components

**Status:** proposed — open for re-evaluation
**Decided by:** TBD
**Supersedes:** none (related to [ADR-0003](0003-renderer-contract-in-app.md))

## Context

[ADR-0003](0003-renderer-contract-in-app.md) decided against Storybook in favor of an in-app `/admin/genui-gallery`. That decision was made under the assumption that:

- A single frontend contributor at a time.
- Eval coverage (P2.4 fixtures) is the primary regression gate.
- Renderer changes are infrequent.

ADR-0012 records the conditions under which Storybook would be re-evaluated:

1. Frontend contributors exceed 2 sustained.
2. Eval coverage proves systematically insufficient at catching renderer regressions (we ship a renderer bug to the field that fixtures didn't cover, twice within 90 days).
3. We adopt component-level visual regression tooling that integrates more cleanly with Storybook than with our gallery (e.g. Chromatic).

## Decision

**Pending.** This ADR is a tracking record. Today the answer remains "no Storybook" per ADR-0003. Re-open the question if any of the conditions above become true.

## Consequences

Holding the no-Storybook line:

- We continue investing in `/admin/genui-gallery` and gallery-coverage tests.
- Storybook's interactive component dev experience is unavailable; engineers run the full app to develop components.

Adopting Storybook later:

- Adds a parallel build pipeline (one engineer-week to integrate cleanly).
- Adds a docs ecosystem to maintain.
- Constraint 5 unaffected (dev-only dependency).

## Resolution criteria

The team explicitly evaluates against the three conditions above. Re-open this ADR when one is observed; resolve to `accepted` or `superseded` based on the call.

## Alternatives considered

See ADR-0003 for the original alternatives analysis.
