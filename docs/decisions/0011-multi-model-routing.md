# ADR-0011 — Multi-model routing within Bedrock

**Status:** proposed — awaiting owner decision
**Decided by:** TBD (project owner)
**Supersedes:** none

## Context

`CONSTRAINTS.md` constraint 9: *"AI: AWS Bedrock only — Model: us.anthropic.claude-opus-4-6-v1. No OpenAI, no direct Anthropic API."*

Different stages of the agent loop have different cost / quality / latency needs:

- **Orchestrator / planner / final spec generation** — strong frontier model. Opus 4.6 is appropriate.
- **Spec-field extraction** ("parse this user prompt into a structured snapshot") — small, deterministic task. Haiku-class is sufficient and ~12x cheaper.
- **LLM judge** for the eval harness — different model from the evaluatee, otherwise same-model bias inflates scores.

Strict reading of constraint 9: only Opus 4.6 is allowed. Cost story is "Opus everywhere, with prompt caching to compensate."

Relaxed reading: "Bedrock + Anthropic family, with Opus 4.6 as the default." Cost reduces by ~40–50% on typical conversations because the cheap legs of the loop drop to Haiku.

## Options

**Option A — Strict (Opus only)**

- P3.2 (multi-model routing) is dropped.
- Eval judge is Opus; same-model bias is documented.
- Cost story relies on prompt caching + tool result caching only.

**Option B — Relaxed (Anthropic family)**

- P3.2 implements a model gateway routing extractor → Haiku, judge → Sonnet.
- Constraint 9 amended: "AI generation: AWS Bedrock + Anthropic-family models. Opus 4.6 for orchestration / final emission. Other Anthropic models (Sonnet, Haiku) allowed for ancillary roles."
- Eval gate confirms parity (extractor accuracy ≥ 95% vs. Opus baseline).

## Decision

**Pending.** This ADR remains in `proposed` state until the owner makes a call. Until then:

- P3.2 is paused.
- Eval judge runs on Opus 4.6 with documented same-model bias.
- Cost rollups are tracked under the assumption of Option A.

The recommendation from the architecture conversation is **Option B** — the cost delta is meaningful at scale, and the safety story (different-model judge) is materially better. But the call belongs to the owner.

## Consequences

**Option A:**

- Stronger constraint preservation; no constraint amendment needed.
- ~2x ongoing cost compared to Option B.
- Same-model judge bias persists.

**Option B:**

- Constraint 9 amended (see exact wording above).
- Cost reduction estimated 40–50% on the eval set.
- Cleaner eval reports (no same-model bias).
- One ADR to write (this one, transitioned to `accepted`) and one constraint to update.

## Resolution criteria

The owner answers:

- Is constraint 9 strict (Opus only) or scoped to Anthropic family on Bedrock?
- If relaxed, is there any concern with eval judge running on a different model than the evaluatee?

Once answered, transition this ADR to `accepted` with the decision; update `CONSTRAINTS.md` constraint 9 if Option B; resume or cancel P3.2.

## Alternatives considered

- **Allow non-Anthropic models on Bedrock (Cohere Command, Llama).** Out of scope of this ADR; would require an additional decision and is not currently needed.
- **Mix Bedrock + non-Bedrock providers.** Hard-blocked by constraint 9 even in Option B.
