# ADR-0002 — Async generation via Postgres-backed queue

**Status:** accepted (2026-05-07)
**Decided by:** project owner
**Supersedes:** none

## Context

Long-running generations (30–120s) cannot be tied to the HTTP request lifecycle. A worker queue is needed. The standard options:

- **Temporal** — full workflow engine, durable execution, per-step retries. Heavy: separate cluster, SDK, learning curve.
- **AWS Step Functions** — managed, AWS-native, fits our infra story. Adds a new AWS service to operate; cost per state transition.
- **BullMQ + Redis / ElastiCache** — simple, widely used. Adds Redis as a runtime dependency and a new piece of infrastructure.
- **Postgres-backed queue** — table + `FOR UPDATE SKIP LOCKED`. Uses the database we already have. No new infrastructure.

DemoForge's scale today: 5–20 concurrent SAs, peak < 50 concurrent generations. Failure modes of a Postgres queue (lock contention, lease expiry handling) are well understood.

## Decision

Implement the async pipeline as a Postgres-backed queue using a Drizzle `agent_jobs` table and a `setInterval` worker loop inside the existing ECS task. Use `FOR UPDATE SKIP LOCKED` for safe concurrent leases.

## Consequences

**Easier:**

- Constraint 5 (no new dependencies) preserved.
- One database to back up, monitor, and operate.
- Job state queryable with the same Drizzle layer used for everything else.
- Idempotency, retries, lease expiry — all simple SQL.

**Harder:**

- Polling latency floor: jobs picked up every 1 second. For our scale this is fine; for sub-100ms job pickup we'd need NOTIFY/LISTEN (still inside Postgres) or revisit.
- No built-in workflow visualization; we render job state in admin UI ourselves (covered in P2.2).
- Throughput ceiling tied to Postgres connection count and CPU. Estimated headroom on Neon: > 1000 jobs/minute, far above our load.

## Revisit conditions

Re-open this ADR if any of these become true:

1. Sustained queue depth > 20 with concurrent workers exhausted.
2. Generation pipelines that need durable per-step retries with custom rollback (current per-turn retry is sufficient; per-step is a P2.2 v1.1 deferral).
3. Cross-region job execution becomes a requirement.
4. Field-tool usage exceeds 100 concurrent SAs sustained.

## Alternatives considered

- **Temporal Cloud.** Excellent for complex workflows; overkill for our shape. Cost and operational overhead not justified.
- **Step Functions Standard.** Good fit if we were starting greenfield; pulling generation logic into a state machine is a substantial rewrite for benefits we don't yet need.
- **BullMQ + Redis.** Simplest of the external options, but Redis is a new piece of infrastructure to operate. Rejected on operational cost.
- **In-memory queue.** Trivial but not durable across ECS task replacement. Rejected.
