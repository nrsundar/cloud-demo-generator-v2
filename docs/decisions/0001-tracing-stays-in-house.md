# ADR-0001 — Tracing stays in-house, not LangFuse / LangSmith

**Status:** accepted (2026-05-07)
**Decided by:** project owner
**Supersedes:** none

## Context

Standard APM tools (DataDog, New Relic) were not designed for stochastic systems. The GenAI ecosystem has produced specialized SaaS observability — LangFuse, LangSmith, Helicone, Phoenix, Arize. Each requires a new external dependency, an account, an API key, and (for some) a runtime SDK that sees every prompt and tool I/O.

DemoForge's tracing requirements are: per-turn span tree, full input/output capture, token + cost accounting, admin UI, sampling not required, retention manageable.

## Decision

Build the tracing layer in-house using the existing stack:

- Drizzle tables `agent_traces` and `agent_spans` in Neon.
- An admin UI tab that uses the existing CSS classes from `client/src/styles/shell.css`.
- A small `withSpan(...)` helper for instrumentation.

No external service, no new dependency, no API key.

## Consequences

**Easier:**

- Constraint 5 (no new dependencies) preserved.
- Trace data lives in our own Postgres alongside everything else; cross-querying with `demo_requests`, `agent_jobs`, etc. is trivial.
- No data leaves our network; no third-party privacy review needed.
- The admin UI fits the design system without bridging.

**Harder:**

- We have to build the timeline visualizer ourselves (~one engineer-day).
- Features that come for free from SaaS (alerting integrations, multi-project dashboards) we either build or skip.
- If we later want OTel-format export, we have to add it.

## Alternatives considered

- **LangFuse (self-hosted).** Drops the vendor risk but adds a new service to operate. Rejected — operational cost > benefit for a single-tenant tool.
- **LangSmith (SaaS).** Quick to integrate but data leaves AWS, requires API keys per environment. Rejected on data-locality grounds and constraint 5.
- **OpenTelemetry exporter only.** Postpones the dashboard problem to whatever we point OTel at. Rejected — we still need to write the UI somewhere; might as well own it.
