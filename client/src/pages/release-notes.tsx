import React from "react";

const RELEASES = [
  {
    version: "3.6.0",
    date: "2026-05-09",
    title: "Phase 2 — Service-Grade Operations",
    features: [
      "Per-turn tracing + cost accounting — every model/tool call produces spans with latency, tokens, and USD cost (P2.1)",
      "Admin Traces API — GET /api/admin/traces, GET /api/admin/traces/:id, GET /api/admin/traces/cost-rollup (P2.1)",
      "Async generation pipeline — jobs survive browser disconnects, resume from My Requests (P2.2)",
      "POST /api/generator/agent/start for async job submission with idempotency (P2.2)",
      "Postgres-backed job queue with FOR UPDATE SKIP LOCKED, 3x retry, 60s lease (P2.2)",
      "Tool result cache — automatic caching with per-tool TTLs (7d static, 24h generation, 1h search) (P2.3)",
      "Principal-sensitive cache hashing prevents cross-user data leaks (P2.3)",
      "Eval harness scaffolding — 5 fixtures, tier-1 deterministic scoring, npm run eval:fast (P2.4)",
      "Node 20 runtime (Dockerfile + package.json) — required by AWS SDK v3.1042+",
      "User Guide: Resources section with live links",
      "Presentation: updated What's Next + Resources slide",
    ],
  },
  {
    version: "3.5.0",
    date: "2026-05-09",
    title: "Production Hardening + One-Button Deploy",
    features: [
      "scripts/deploy.sh — type-check, Docker build, ECR push, ECS force-redeploy in one command",
      "Dockerfile with RDS global CA bundle for TLS cert verification",
      "ALB/CloudFront timeout alignment for long-running agent turns",
    ],
  },
  {
    version: "3.4.0",
    date: "2026-05-09",
    title: "SSE Streaming + Tool-Use Fixes",
    features: [
      "Switch Generator to SSE streaming (fixes 504 timeouts on long generations)",
      "Properly enable agent tool-use with extended timeouts",
      "MAX_TOKENS bumped to 64K for tool-use loops",
      "Budget: 8 iterations, 150s max turn latency",
    ],
  },
  {
    version: "3.1.0",
    date: "2026-05-07",
    title: "Phase 1 — Agent Foundation",
    features: [
      "Agent loop with persistent state (agent_sessions + agent_steps tables)",
      "Tool catalog: 10 tools (generateCFTemplate, generateSchema, generateAppCode, etc.)",
      "SSE streaming endpoint for real-time generation progress",
      "Safety middleware: input sanitization, rate limiting, tool permission checks, output redaction",
      "Tenancy/ACLs: tools scoped by principal, admin-only endpoints enforced",
      "Structured generation with envelope validation and component type checking",
      "Generative UI: 16 component types rendered inline in the Generator canvas",
    ],
  },
  {
    version: "3.0.0",
    date: "2026-05-01",
    title: "V3 — AWS-Native Rewrite",
    features: [
      "Full rewrite: Cloudscape UI, Cognito auth, ECS Fargate, RDS PostgreSQL",
      "CloudFormation stack for one-command infrastructure deployment",
      "Demo Generation Agent + Bug Fix Agent (human-in-the-loop approval)",
      "Duplicate detection prevents regenerating existing demos",
      "Admin dashboard: approve/reject requests, bulk operations, agent actions log",
    ],
  },
];

export default function ReleaseNotesPage() {
  return (
    <>
      <div className="page-head">
        <div><h1>Release Notes</h1><p>What shipped and when.</p></div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 800 }}>
        {RELEASES.map((r) => (
          <div key={r.version} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 24, boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>v{r.version} — {r.title}</h2>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "monospace" }}>{r.date}</span>
            </div>
            <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.8 }}>
              {r.features.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
