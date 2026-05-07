# ADR-0013 — Workflow orchestrator upgrade

**Status:** proposed — open for re-evaluation
**Decided by:** TBD
**Supersedes:** none (related to [ADR-0002](0002-async-via-postgres-queue.md))

## Context

[ADR-0002](0002-async-via-postgres-queue.md) decided on a Postgres-backed job queue rather than Temporal, Step Functions, or BullMQ. ADR-0013 records the conditions under which the question of upgrading the orchestrator would be re-evaluated.

## Decision

**Pending — no change today.** The Postgres queue is sufficient at field-tool scale.

Re-open this ADR if any of the following become true:

1. Sustained queue depth > 20 with concurrent workers exhausted (queue is the bottleneck).
2. Generation pipelines that genuinely need durable per-step retries with custom rollback (the per-turn retry is no longer enough).
3. Cross-region job execution becomes a requirement.
4. Field-tool usage exceeds 100 concurrent SAs sustained.
5. A new product surface introduces multi-day or multi-week workflows (e.g. customer engagement tracking).

## Consequences

Holding the Postgres-queue line:

- Continued operational simplicity. No new infrastructure.
- Some workflow patterns remain awkward to express (long-running multi-step rollback, branching workflows).

Adopting Temporal / Step Functions later:

- Adds a new piece of infrastructure to operate.
- Workflow definitions move from "ad-hoc TypeScript" to "declarative state machine."
- Rewriting in-flight pipelines is non-trivial; plan for ~2 engineer-weeks of migration per pipeline.

## Resolution criteria

The team explicitly checks the conditions on a quarterly cadence as part of the operational review. If observed, this ADR transitions to `accepted` with the chosen orchestrator and `ADR-0002` is `superseded`.

## Alternatives considered

See ADR-0002 for the original alternatives analysis.
