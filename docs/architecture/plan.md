# Three-Phase Architecture Plan

This document is the master plan. Phase items each have their own design doc under `phase-1/`, `phase-2/`, `phase-3/`. Decisions referenced as ADR-NNNN live under `../decisions/`.

## Goals

- **Production reliability.** A field SA can use DemoForge during a live customer call without surprise.
- **Defensible safety.** Every CFN, code, and module emission passes deterministic linting and scanning before reaching the user.
- **Observability for non-determinism.** Every model call, tool call, and retrieval is traceable to a single conversation turn.
- **Tenancy.** SAs see their data, TAMs see theirs, admins see all — enforced inside the tool layer.
- **Cost predictability.** Per-team, per-user breakdowns; prompt and tool result caching active.
- **Iteration safety.** Prompt and tool changes ride an eval gate before merging.

## Non-goals

- Migrating to Next.js, Remix, or any framework outside the constrained stack (`CONSTRAINTS.md` 6, 7).
- Adding non-Bedrock model providers (`CONSTRAINTS.md` 9).
- Replacing Express, Drizzle, or Neon.
- Reaching for SaaS observability — see [ADR-0001](../decisions/0001-tracing-stays-in-house.md).
- Workflow orchestrators — see [ADR-0002](../decisions/0002-async-via-postgres-queue.md).

## Phase 1 — Foundation (3–4 weeks)

Mandatory before broad field rollout.

| ID | Title | Effort | Doc |
|---|---|---|---|
| P1.1 | Agent loop with persistent state | 1 wk | [phase-1/P1.1-agent-loop.md](phase-1/P1.1-agent-loop.md) |
| P1.2 | Tool catalog | 1.5–2 wk | [phase-1/P1.2-tool-catalog.md](phase-1/P1.2-tool-catalog.md) |
| P1.3 | SSE streaming, resumable | 1 wk | [phase-1/P1.3-streaming.md](phase-1/P1.3-streaming.md) |
| P1.4 | Constrained / structured generation | folded into P1.2 | [phase-1/P1.4-structured-generation.md](phase-1/P1.4-structured-generation.md) |
| P1.5 | Safety middleware | 3–4 d | [phase-1/P1.5-safety-middleware.md](phase-1/P1.5-safety-middleware.md) |
| P1.6 | Tenancy / ACLs in tools | 1 wk | [phase-1/P1.6-tenancy-acls.md](phase-1/P1.6-tenancy-acls.md) |

### Phase 1 milestones

| Milestone | Target | Exit |
|---|---|---|
| M1.A | end of week 1 | `agent_sessions` / `agent_steps` live; existing UI unchanged. |
| M1.B | end of week 2 | Tool catalog refactor complete; non-streaming endpoint passes parity tests. |
| M1.C | end of week 3 | SSE streaming live; safety middleware live in production. |
| M1.D | end of week 4 | Tenancy enforced in tools; integration tests green. |

## Phase 2 — Service-grade operations (2–3 weeks)

| ID | Title | Effort | Doc |
|---|---|---|---|
| P2.1 | Per-turn tracing + cost accounting | 1 wk | [phase-2/P2.1-tracing-cost.md](phase-2/P2.1-tracing-cost.md) |
| P2.2 | Async generation pipeline | 1–1.5 wk | [phase-2/P2.2-async-pipeline.md](phase-2/P2.2-async-pipeline.md) |
| P2.3 | Multi-layer caching | 3–4 d | [phase-2/P2.3-caching.md](phase-2/P2.3-caching.md) |
| P2.4 | Eval harness in CI | 1.5 wk | [phase-2/P2.4-eval-harness.md](phase-2/P2.4-eval-harness.md) |

### Phase 2 milestones

| Milestone | Target | Exit |
|---|---|---|
| M2.A | week 5 | Tracing + cost accounting live. |
| M2.B | week 6 | Async pipeline live; My Requests resume flow works. |
| M2.C | week 7 | Caching live; eval harness gating MRs. |

## Phase 3 — Differentiation and scale (ongoing)

| ID | Title | Effort | Doc |
|---|---|---|---|
| P3.1 | RAG over canonical corpora | 2 wk | [phase-3/P3.1-rag.md](phase-3/P3.1-rag.md) |
| P3.2 | Multi-model routing | 1 wk (gated) | [phase-3/P3.2-multi-model-routing.md](phase-3/P3.2-multi-model-routing.md) |
| P3.3 | Renderer contract hardening | 1 wk | [phase-3/P3.3-renderer-contract.md](phase-3/P3.3-renderer-contract.md) |
| P3.4 | Drift detection | 3–4 d | [phase-3/P3.4-drift-detection.md](phase-3/P3.4-drift-detection.md) |

P3.2 is gated on resolution of [ADR-0011](../decisions/0011-multi-model-routing.md) — the multi-model routing decision.

## Cross-phase work

| Item | Active in | Notes |
|---|---|---|
| Drizzle migrations | All | Each phase adds tables; `drizzle-kit push` at deploy. |
| Version bumps | All | Constraint 10 — bump `package.json` version on every backend deploy. |
| Eval suite growth | Phase 2 onward | New tools and prompt changes ship with their own eval cases. |
| Documentation | All | Each merged change updates `HANDOFF.md` and the relevant phase doc. ADRs added when decisions change. |

## Sequencing rationale

Why this order, not "streaming first to dazzle":

1. **Tool catalog (P1.2) before streaming (P1.3).** Streaming an unsafe monolithic generator just makes bad output arrive faster. Tools first means structured emissions stream cleanly.
2. **Tenancy (P1.6) at end of Phase 1, not start.** Needs the tool layer to land first; otherwise we retrofit ACL into endpoints that are about to be replaced.
3. **Tracing (P2.1) before async (P2.2).** Async failures are nearly impossible to debug without trace timelines; landing tracing first pays for itself the first time a worker job hangs.
4. **Caching (P2.3) before eval (P2.4).** Caching changes outputs in subtle ways (e.g. tool result cache hit returns last week's pricing); the eval harness needs to be aware of cache state. Easier to design eval around the final cache topology.
5. **RAG (P3.1) is Phase 3, not Phase 1.** It is the differentiator, but it relies on tracing (to debug retrieval), tenancy (to filter retrieval), and caching (embeddings). Doing RAG first means doing it twice.

## Risks (cross-phase)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| pgvector not enabled on the Neon plan | Medium | Blocks P3.1 | Verify in week 1 of Phase 3; switch plans if needed. |
| Bedrock prompt caching availability for Opus 4.6 in `us-east-2` | Medium | Reduces P2.3 savings | Verify before P2.3; fall back to in-app Drizzle prompt cache. |
| `cfn-nag` false positives noisy in CFN output | Medium | Slows P1.5 rollout | Start with `cfn-lint` only; add `cfn-nag` behind a feature flag. |
| Async pipeline overruns single ECS task | Low at field-tool scale | Latency under load | Watch P2.2 metrics; scale ECS desired count or revisit ADR-0002. |
| ADR-0011 (multi-model routing) stays strict | Resolved when owner decides | ~2x cost vs. relaxed | Aggressive caching to compensate. |

## Change log

- **2026-05-07** — Initial plan. Six items in Phase 1, four in Phase 2, four in Phase 3. P3.2 gated on ADR-0011.
