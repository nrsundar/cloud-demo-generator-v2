# Architectural Decision Records

This directory holds ADRs for decisions made about DemoForge's architecture. Each decision is one file. Filenames are `NNNN-short-title.md` where `NNNN` is a zero-padded sequential number.

## Status values

- **proposed** — under discussion; not yet binding.
- **accepted** — adopted; binds future work until superseded.
- **superseded** — replaced by a newer ADR. Stays in the tree; the newer ADR links back.

## Index

### Resolved (binding)

- [0001 — Tracing stays in-house, not LangFuse / LangSmith](0001-tracing-stays-in-house.md)
- [0002 — Async generation via Postgres-backed queue](0002-async-via-postgres-queue.md)
- [0003 — Renderer contract enforced via in-app gallery, not Storybook](0003-renderer-contract-in-app.md)
- [0004 — Bedrock embeddings allowed under constraint 9](0004-bedrock-embeddings-allowed.md)
- [0005 — pgvector on Neon for RAG](0005-pgvector-on-neon.md)
- [0006 — Safety toolchain in Docker image](0006-safety-toolchain-docker.md)
- [0007 — Streaming preserves the F1 envelope](0007-streaming-preserves-envelope.md)
- [0008 — Eval harness uses JSONL + Bedrock judge](0008-eval-harness-jsonl-bedrock-judge.md)
- [0009 — SSE auth via query-string token](0009-sse-auth-query-string.md)
- [0010 — GenNode types follow a gated process](0010-gennode-gated-process.md)

### Open (pending decision)

- [0011 — Multi-model routing within Bedrock](0011-multi-model-routing.md)
- [0012 — Storybook for `GenNode` components](0012-storybook-revisit.md)
- [0013 — Workflow orchestrator upgrade](0013-workflow-orchestrator-revisit.md)

## How to write an ADR

Each ADR has these sections:

1. **Context** — the problem and the forces in play.
2. **Decision** — what we are doing.
3. **Status** — proposed / accepted / superseded.
4. **Consequences** — what becomes easier and harder.
5. **Alternatives considered** — what we ruled out and why.

Keep them short — 200–500 words. The point is to record the decision so future contributors can understand *why*, not to write a thesis.
