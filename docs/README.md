# DemoForge Documentation

DemoForge is a production-grade internal tool used by AWS Solutions Architects to generate complete, deployable demo packages (infrastructure, code, learning modules, documentation) for customer engagements. SAs describe what they need in plain English; DemoForge builds everything.

This directory contains the architecture documentation that engineers and field SAs need to understand, maintain, and extend the system.

## Top of the tree

- [`architecture/overview.md`](architecture/overview.md) — system shape today and where it's going.
- [`architecture/plan.md`](architecture/plan.md) — three-phase plan with sequencing rationale.
- [`architecture/phase-1/`](architecture/phase-1/) — six design specs for the production-foundation work (mandatory before broad rollout).
- [`architecture/phase-2/`](architecture/phase-2/) — four design specs for service-grade operations.
- [`architecture/phase-3/`](architecture/phase-3/) — four design specs for differentiation and scale.
- [`decisions/`](decisions/) — ADRs (Architectural Decision Records). Standing decisions and open questions.

## Other repo-root documents

- [`../HANDOFF.md`](../HANDOFF.md) — operational handoff: clone, run, deploy, accounts, credentials.
- [`../CONSTRAINTS.md`](../CONSTRAINTS.md) — non-negotiable invariants every change must respect.
- [`../CONTEXT.md`](../CONTEXT.md) — historical project context.

## How to use these docs

- **Picking up the codebase:** read `HANDOFF.md`, then `architecture/overview.md`, then the Phase 1 specs.
- **Adding or changing a feature:** check `CONSTRAINTS.md` first; if your change touches a decision recorded as an ADR, link to (or supersede) that ADR.
- **Reviewing a merge request:** the MR description should reference the design doc and the ADRs it complies with.

## ADR conventions

ADRs are numbered sequentially (`0001-...md`, `0002-...md`, …). Each has a status (`accepted`, `superseded`, `proposed`). Superseded ADRs stay in the tree — link from the superseder. Open ADRs (status `proposed`) describe decisions awaiting input.

## Phase doc conventions

Each phase doc has the same sections in the same order:

1. **Status** — `not started`, `in progress`, or `done`.
2. **Context** — why we are doing this now.
3. **Design** — what we are building, including schema and file changes.
4. **Constraint compliance** — explicit table mapping the design to the constraints it touches.
5. **Sequencing and dependencies** — what must land before this and after this.
6. **Exit criteria** — measurable definition of done.
7. **Risks** — what could go wrong.
8. **Out of scope** — what we are deliberately not doing here.
9. **Related ADRs** — links to relevant decision records.
