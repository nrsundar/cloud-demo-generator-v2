import React, { useState } from "react";

const SECTIONS = [
  { icon: "🚀", title: "Getting Started", content: [
    "Navigate to the Generator page from the sidebar.",
    "Describe your demo in plain English — e.g., 'pgvector RAG demo for a healthcare CTO, pretty technical'.",
    "The AI agent infers the database, extension, industry, and audience from your prompt.",
    "It only asks clarifying questions for things it cannot infer (audience depth, session duration).",
    "Once it has enough context, it generates a complete demo package automatically.",
  ]},
  { icon: "✨", title: "Generative UI", content: [
    "The Generator page uses a conversational AI canvas — no forms to fill.",
    "The AI returns structured components (AudienceProfile, InfraPreview, SchemaPreview, CodePreview, ModuleList, ProgressTimeline, ConfirmationCard) rendered inline.",
    "Each card's type is shown as a mono badge in its header so you can identify what the agent emitted.",
    "The right rail shows a live spec snapshot that updates every turn.",
    "Click any field in the spec rail to revise it via conversation.",
    "A different prompt composes a completely different result page from the same component library.",
  ]},
  { icon: "📋", title: "My Requests", content: [
    "Track the status of every demo you've requested.",
    "Statuses: DRAFT → NEEDS ANSWERS → BUILDING SPEC → AWAITING REVIEW → APPROVED → GENERATING → READY.",
    "When the AI needs more info, click 'Answer Questions' to provide clarifications.",
    "After answering, the AI generates a full demo spec → an admin reviews and approves → the system builds your package.",
    "Ready demos can be downloaded as a ZIP containing CloudFormation, code, modules, and documentation.",
  ]},
  { icon: "📦", title: "Demo Package Contents", content: [
    "CloudFormation template (main.yaml) — VPC, subnets, security groups, database cluster, IAM roles.",
    "Application code — Python/TypeScript with database connectivity, sample queries, API endpoints.",
    "Learning modules — 6-8 guided exercises with explanations, pitched for your target audience.",
    "Demo script — step-by-step walkthrough for presenting to customers.",
    "Seed data — synthetic data matching the use case (e.g., clinical notes, transactions, IoT readings).",
    "README with setup instructions, prerequisites, and cleanup commands.",
  ]},
  { icon: "⚡", title: "Deploy & Cleanup", content: [
    "Download the ZIP and extract it.",
    "Deploy: aws cloudformation create-stack --stack-name cdg-<name> --template-body file://cloudformation/main.yaml --parameters ParameterKey=DBPassword,ParameterValue=<pw> --capabilities CAPABILITY_NAMED_IAM",
    "Wait: aws cloudformation wait stack-create-complete --stack-name cdg-<name>",
    "Cleanup: aws cloudformation delete-stack --stack-name cdg-<name>",
    "Each demo costs approximately $0.30-$0.50/hour while running (db.t4g.micro free tier eligible).",
  ]},
  { icon: "🎯", title: "Best Practices", content: [
    "Be specific about the customer context: 'pgvector for healthcare CTO pitch' > 'vector search demo'.",
    "Mention the audience type: technical (architect/developer) vs executive (CTO/VP).",
    "Specify session duration if you have a constraint (e.g., '45 min session').",
    "Include the industry for tailored data and compliance considerations.",
    "Use the Generator's example prompts as templates for effective requests.",
  ]},
  { icon: "🔒", title: "Admin Dashboard", content: [
    "Admins can review specs, approve/reject requests, and monitor agent actions.",
    "Bulk approve: select multiple requests and approve them in one click.",
    "Regenerate: re-run the generation pipeline for any completed or approved request.",
    "Bug Tracker: the self-healing agent scans repos hourly and proposes fixes.",
    "Agent Actions: view all AI agent tool calls, token usage, and outcomes.",
  ]},
  { icon: "🤖", title: "Self-Healing System", content: [
    "The Bug Fix Agent runs hourly, scanning all generated repositories for issues.",
    "It detects: missing files, broken imports, invalid CloudFormation, stale dependencies, security issues.",
    "When a bug is found, it proposes a fix with severity level and root cause analysis.",
    "Admins review and approve fixes from the Bug Tracker tab in the Admin Dashboard.",
    "Upon approval, the system automatically applies the fix and redeploys if needed.",
    "If a fix requires downtime, a warning is shown before proceeding.",
  ]},
  { icon: "📊", title: "Observability & Tracing (added 2026-05-09)", content: [
    "Every agent turn is fully traced — model calls, tool calls, and safety checks produce spans.",
    "Admin Dashboard → Traces tab shows per-turn timelines with latency and token counts.",
    "Cost accounting: per-user, per-session, per-model breakdowns (Opus 4.6: $15/M in, $75/M out).",
    "Trace detail view shows the full span tree for any turn — useful for debugging 'why did the AI do X?'.",
    "Cost rollup API: GET /api/admin/traces/cost-rollup?days=7 for weekly spend summaries.",
    "90-day retention; older traces aggregated into daily rollups.",
  ]},
  { icon: "📚", title: "Resources (added 2026-05-09)", content: [
    "Live app: https://main.d1s77hhl4y34ji.amplifyapp.com",
    "API endpoint: http://demo-gen-alb-29620839.us-east-2.elb.amazonaws.com",
    "Source (GitLab): ssh.gitlab.aws.dev:raghasun/cloud-demo-generator-v2",
    "Source (GitHub): github.com/nrsundar/cloud-demo-generator-v2",
    "Architecture docs: /docs/architecture/overview.md in the repo",
    "Deployment guide: /DEPLOY.md — one-command CloudFormation deploy",
    "Presentation slides: navigate to /presentation in the app (12 slides, keyboard nav)",
    "Constraints & ADRs: /CONSTRAINTS.md and /docs/decisions/ for design rationale",
  ]},
];

const FAQ = [
  { q: "What databases are supported?", a: "Aurora PostgreSQL, DynamoDB, Neptune, ElastiCache Redis, DocumentDB, and Aurora MySQL. More coming soon." },
  { q: "How long does generation take?", a: "Typically 1-3 minutes for the full package (spec + infrastructure + code + modules + documentation)." },
  { q: "Can I customize the generated code?", a: "Yes — download the ZIP and modify anything. The code is yours. You can also regenerate with different parameters." },
  { q: "What extensions are supported for PostgreSQL?", a: "pgvector, PostGIS, pgRouting, pg_cron, pg_partman, pg_trgm, auto_explain, pg_stat_statements, hstore, ltree, apache_age, timescaledb, and any custom extension." },
  { q: "Who can approve demo requests?", a: "Users with admin privileges. Contact the team lead to get admin access." },
  { q: "What happens if generation fails?", a: "The request shows 'FAILED' status. You can retry from My Requests or ask an admin to regenerate." },
  { q: "Is there a cost to run the generated demos?", a: "The generation itself is free. Running the deployed infrastructure costs ~$0.30-$0.50/hour (db.t4g.micro). Always clean up after demos." },
  { q: "Can I share demos with customers?", a: "Yes — the ZIP is self-contained. Share it directly or deploy it in a shared AWS account for live demos." },
  { q: "How does the dedup system work?", a: "When you request a demo, the system checks if a similar one already exists in the catalog. If so, it suggests the existing demo instead of generating a duplicate." },
  { q: "What's the difference between Generator and My Requests?", a: "Generator is the conversational AI canvas where you describe what you need. My Requests tracks the status of all your submissions and lets you answer clarifying questions." },
];

export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <div className="page-head">
        <div><h1>User Guide</h1><p>Everything you need to know to get the most out of DemoForge.</p></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 40 }}>
        {SECTIONS.map((s, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
            <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700 }}>{s.title}</h3>
            <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
              {s.content.map((c, j) => <li key={j}>{c}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>❓ Frequently Asked Questions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FAQ.map((f, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
              <div onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 600, fontSize: 14 }}>
                {f.q}
                <span style={{ color: "var(--text-soft)", fontSize: 18 }}>{openFaq === i ? "−" : "+"}</span>
              </div>
              {openFaq === i && <div style={{ padding: "0 18px 14px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{f.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
