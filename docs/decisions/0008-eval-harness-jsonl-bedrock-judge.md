# ADR-0008 — Eval harness uses JSONL fixtures + Bedrock LLM-as-judge

**Status:** accepted (2026-05-07)
**Decided by:** project owner
**Supersedes:** none

## Context

P2.4 needs an eval harness with three properties: deterministic checks for fast CI, rubric-based heuristics for moderate fidelity, and an LLM judge for subjective qualities. The judge needs to be:

- Different from the model being evaluated (to avoid same-model bias).
- Affordable to run nightly.
- Accessible without leaving Bedrock (constraint 9).

The fixtures need to be:

- Versioned in the repo.
- Easy to extend by anyone (no special tooling).
- Diff-friendly in MR review.

## Decision

- **Fixtures**: JSONL files under `tests/evals/fixtures/`, one fixture per line. Schema documented in P2.4.
- **Runner**: `tsx` script (`tests/evals/run.ts`) — uses the same TypeScript / Node runtime as the rest of the project.
- **Scoring**: three tiers — deterministic checks, rubric heuristics, LLM-as-judge.
- **Judge**: Bedrock call. Today (single-model regime) the judge is also Opus 4.6, with documented same-model-bias caveat. If [ADR-0011](0011-multi-model-routing.md) opens to Anthropic-family routing, the judge becomes Sonnet.

## Consequences

**Easier:**

- Constraint 5 preserved — no eval framework dependency.
- Fixtures live next to the code in one repo; MR review sees fixture changes alongside code changes.
- LLM judge prompts live in `tests/evals/judges/` and are versioned.
- Eval runs are themselves traced (P2.1), so debugging eval failures uses the same trace UI.

**Harder:**

- We write the runner ourselves (~one engineer-day).
- Same-model bias is a real concern until ADR-0011 opens. Mitigated by documenting the caveat in eval reports.
- LLM-as-judge variance: at temperature 0 and with structured output, variance is manageable. Multi-sample (run 3x) on tier 3 keeps reports stable.

## Alternatives considered

- **Promptfoo / DeepEval / Inspect AI.** Mature eval frameworks. Rejected on constraint 5 — adding a new framework is meaningful complexity for a tool that needs to be small and stack-coherent.
- **Manual review only.** Doesn't scale; doesn't catch silent regression. Rejected.
- **Production-only sampling.** Useful as a complement, not a replacement; defer to a later phase.
- **External LLM judge (GPT-4 etc.).** Better cross-model bias coverage but blocked by constraint 9.
