# ADR-0003 — Renderer contract enforced via in-app gallery, not Storybook

**Status:** accepted (2026-05-07)
**Decided by:** project owner
**Supersedes:** none

## Context

The Generator is a generative UI surface — the agent emits structured `GenNode` JSON and the renderer turns it into UI. Hardening this contract requires:

- A way to see every variant of every component type rendered in isolation.
- Coverage tests that the renderer handles every type.
- A canonical fixture set that doubles as eval ground truth.

Storybook is the standard tool for this. It is a developer dependency, not a runtime one — so constraint 5's bundle-size argument does not apply. But it adds a build pipeline, a config surface, a docs ecosystem, and a place where component behavior diverges from the production renderer over time.

## Decision

Build an in-app `/admin/genui-gallery` route that renders every `GenNode` variant from a fixture file. The fixture file is the same JSONL used by P2.4's eval harness. Coverage is enforced by a CI script that fails if any `GenNode` type lacks a fixture.

No Storybook.

## Consequences

**Easier:**

- Single source of truth for "what valid GenUI looks like" — the eval harness and the gallery use the same fixtures.
- The gallery uses the production renderer in the production design system. No drift between Storybook and reality.
- No new dev dep, no new build pipeline, no Storybook docs ecosystem to keep current.
- Field SAs can be pointed to the gallery to understand what the agent can emit.

**Harder:**

- We give up Storybook's interactivity controls and addons. We don't need most of them.
- We rebuild the "preview component in isolation with various props" experience inside our own admin route. Estimated 1 day of work.

## Revisit conditions

Re-open if eval coverage proves systematically insufficient at catching renderer regressions, or if we have multiple frontend contributors needing isolated component dev.

See [ADR-0012](0012-storybook-revisit.md) for the open ticket.

## Alternatives considered

- **Storybook.** Standard, mature, lots of addons. Adds a parallel build and doc ecosystem. Rejected on simplicity grounds.
- **Ladle.** Storybook-compatible but lighter. Same trade-off; rejected for the same reason.
- **No gallery, rely on visual regression in production.** Cheapest, but field bugs become the only signal. Rejected — we want to see the surface deliberately.
