# ADR-0005 — pgvector on Neon for RAG

**Status:** accepted (2026-05-07)
**Decided by:** project owner
**Supersedes:** none

## Context

P3.1 needs a vector store. Options on the table:

- **pgvector on Neon** — the database we already have; extension activated with `CREATE EXTENSION vector;`. Hybrid lexical + vector search via existing Postgres FTS.
- **Amazon OpenSearch** — managed, scales well, more features. New service to operate, separate auth, separate cost line.
- **Pinecone / Weaviate** — purpose-built vector stores. New SaaS dependency, separate billing, data leaves AWS.
- **Aurora PostgreSQL with pgvector** — same as Neon but on AWS-managed Postgres. Migration cost; we do not have Aurora today.

DemoForge's anticipated corpus size is on the order of:

- 50–500 demo packages.
- 500–5000 AWS doc chunks.
- 20–200 internal playbooks.

Total: < 100K chunks at v1, growing slowly. Well within Postgres + pgvector's comfortable range (Postgres is happy with 1M+ vectors per index; performance issues start in the 10M+ range).

## Decision

Use pgvector on Neon. Drizzle custom column type for `vector(N)`. HNSW index for ANN search. Hybrid blend with Postgres FTS for lexical recall.

## Consequences

**Easier:**

- One database to operate. Constraint 8 (Drizzle + Neon) preserved.
- Filter pruning by ACL (P1.6) is a JOIN — no separate ACL system in the vector store.
- All metadata in one place; transactional consistency between corpus rows and chunks.
- Constraint 5 (no new dependencies) preserved — pgvector is a Postgres extension, not an npm package.

**Harder:**

- Drizzle does not have first-class pgvector support; we author a `customType` (~30 LOC). Compliant with constraint 8 — still inside Drizzle's API surface, no raw SQL outside Drizzle.
- HNSW index creation is a DDL operation that takes minutes on large corpora. Plan migrations carefully.
- Recall is good but not industry-leading. If we need re-ranking we add it (P3.1 risk).

## Prerequisite verification

Before P3.1 starts, verify:

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
-- if empty:
CREATE EXTENSION vector;
```

If the Neon plan does not allow `CREATE EXTENSION vector`, escalate to plan upgrade. Document the verification result in the P3.1 doc when done.

## Alternatives considered

- **OpenSearch.** Stronger out-of-the-box hybrid retrieval; managed scaling. Rejected on operational overhead and the smaller-than-expected corpus.
- **Pinecone.** Best-in-class vector search. New SaaS dep; data leaves AWS; rejected on data-locality and constraint 5.
- **Aurora pgvector.** Same as Neon with different operations. We have no reason to migrate from Neon today.
- **In-memory (FAISS / hnswlib in-process).** Fastest possible, but loses on persistence, ACL filtering, multi-instance consistency. Rejected.
