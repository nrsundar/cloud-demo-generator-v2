# ADR-0007 — Streaming preserves the F1 envelope

**Status:** accepted (2026-05-07)
**Decided by:** project owner
**Supersedes:** none

## Context

Constraint 20: *"Generator agent must return structured JSON — Schema: `{message, components[], specSnapshot, phase}`. No freeform text responses."*

P1.3 introduces SSE streaming. A stream emits incremental events (`prose_token`, `component_committed`, etc.). If the streaming endpoint replaced the existing JSON endpoint, every existing client and any future non-streaming consumer would be broken.

## Decision

The SSE stream's final event, `event: complete`, carries the **full F1 envelope** as its `data` payload — `{message, components, specSnapshot, phase}`. Every non-streaming consumer can call `POST /api/generator/agent` (kept around) and receive the same envelope.

The two endpoints share an implementation: `runTurn` is implemented as `for await (const event of runTurnStream(...))` collecting the final `complete` event.

## Consequences

**Easier:**

- Constraint 20 unconditionally preserved — non-streaming clients keep working.
- One implementation, two transports. No drift between the two paths.
- Eval harness (P2.4) can use the non-streaming endpoint deterministically without consuming an SSE stream.
- Server-side replay (`Last-Event-ID` resume) is bounded — replaying through `complete` gives a complete envelope every time.

**Harder:**

- The streaming endpoint must always emit `complete`. A bug that drops the final event would leave clients hung; we add a server-side timeout that synthesizes an `error` envelope event after `MAX_TURN_LATENCY_MS` (P1.1 budget).
- Component renders happen twice on the client during streaming — once incrementally as `component_committed` arrives, then implicitly hydrated from `complete` on resume. We deduplicate by `componentId`.

## Alternatives considered

- **Streaming-only.** Cleaner but breaks the eval harness and any future non-streaming consumer. Rejected.
- **Final event with only a delta from the last incremental.** Saves bandwidth but means consumers must reassemble the envelope from events. Rejected — fragile across reconnects.
- **Two independent implementations of the agent loop.** Drift risk too high. Rejected.
