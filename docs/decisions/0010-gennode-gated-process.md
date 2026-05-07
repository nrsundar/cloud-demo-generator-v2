# ADR-0010 — GenNode types follow a gated process

**Status:** accepted (2026-05-07)
**Decided by:** project owner
**Supersedes:** none

## Context

Constraint 21: *"GenNode types are fixed — 18 types defined in `components/genui/types.ts`. Don't add new types without updating the renderer in `generator.tsx`."*

Two practical issues:

1. **Discrepancy.** The actual file (`client/src/components/genui/types.ts`) defines **17 types**, not 18. Either constraint 21 needs updating or a 18th type needs adding.
2. **Process.** Architectural plans (P3.1's `RagCitation`, future possibilities) will want to add new types. Without a process, this either (a) blocks indefinitely, (b) sneaks in via untested MRs, or (c) splits server emission and client renderer.

## Decision

Adding a new `GenNode` type follows this gated process, in order:

1. **ADR.** Open an ADR justifying the new type (one paragraph is fine if obvious).
2. **Renderer first.** Add the React component handling the new variant. Add a fixture to `gallery-fixtures.json`. CI gallery-coverage check passes (P3.3).
3. **Schema update.** Add the variant to the `GenNodeSchema` Zod union (P1.4). The sync script (`scripts/sync-gennode-schema.ts`) verifies parity with `types.ts`.
4. **Prompt update.** Update the agent system prompt and tool descriptions to mention when the new type should be emitted.
5. **Eval gate.** Add at least one eval fixture exercising the new type (P2.4). The fast suite must still pass.
6. **Constraint update.** If the count changes, bump constraint 21's count in `CONSTRAINTS.md`.
7. **Merge.** MR title prefixed with `gen-node:` for visibility.

Removing or renaming a `GenNode` type follows the same process plus a deprecation note in the relevant ADR.

## Consequences

**Easier:**

- Renderer and agent stay in lockstep. No "the agent emits something the client cannot render" failure mode.
- Eval coverage forced by step 5; new types ship with their own test cases.
- The gallery (P3.3) doubles as the canonical reference for what types exist.

**Harder:**

- Adding a type is no longer a one-line change. Engineers add 5 small commits instead of 1. The friction is intentional — the GenNode contract is load-bearing.

## Action items from this ADR

- Resolve the 17-vs-18 discrepancy. Two options:
  - **Update constraint 21** to "17 types" pending future additions.
  - **Add the 18th type** (most likely candidate: `RagCitation` from P3.1).

Recommendation: defer the count update to when P3.1 lands (`RagCitation` makes it 18 cleanly). In the meantime, treat constraint 21 as "≥ 17 types, current count tracked in `types.ts`."

## Alternatives considered

- **Frozen forever.** Eliminates churn but blocks legitimate Phase 3 work. Rejected.
- **No process — anyone can add a type any time.** Drift between server emission and client renderer becomes inevitable. Rejected.
- **Deprecation tombstones for removed types.** Add later if we ever remove a type; out of scope for this ADR.
