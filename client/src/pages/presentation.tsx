import React, { useState, useEffect } from "react";

const SLIDES = [
  {
    title: "Cloud Demo Generator",
    subtitle: "Self-Evolving AI Agents for AWS Database Enablement",
    bullets: [],
    note: "Built with Amazon Bedrock (Claude Opus 4) • ECS Fargate • Aurora PostgreSQL • Cognito",
    accent: "#ff9900",
    image: "",
  },
  {
    title: "The Value",
    subtitle: "From days to minutes — at scale",
    bullets: [
      "⏱️  10 minutes to generate what takes 2-3 days manually",
      "🎯  Industry-specific — healthcare, fintech, retail, manufacturing",
      "📦  Complete package — infra, code, data, modules, demo scripts",
      "🔄  Self-improving — learns from failures, fixes itself hourly",
      "🌐  1000+ field SAs can request demos simultaneously",
      "💰  Zero marginal cost per demo after initial setup",
    ],
    note: "",
    accent: "#2ecc71",
    image: "",
  },
  {
    title: "Agentic Architecture",
    subtitle: "Two autonomous AI agents with human-in-the-loop",
    bullets: [
      "🤖  New Demo Agent — generates complete demos from natural language",
      "🔧  Bug Fix Agent — scans logs hourly, proposes fixes autonomously",
      "👤  Human-in-the-loop — admin approves before any execution",
      "📊  Metrics tracked — tokens used, time elapsed, per generation",
      "🧠  Extension Skills — grounding data prevents hallucination",
      "✅  12+ Eval Checks — validates every output before delivery",
    ],
    note: "Agents propose → Admin approves → Agent executes → Eval validates",
    accent: "#9b59b6",
    image: "",
  },
  {
    title: "Request → Queue → Generate",
    subtitle: "How a demo request flows through the system",
    bullets: [
      "1️⃣  SA submits request — \"pgvector fraud detection for fintech\"",
      "2️⃣  AI generates 5 clarifying questions (30 seconds)",
      "3️⃣  SA answers → AI generates full spec (90 seconds)",
      "4️⃣  Admin reviews spec → approves with one click",
      "5️⃣  AI generates template — 17 Bedrock calls in parallel batches",
      "6️⃣  Eval validates output → appears in AI Demo Catalog",
      "7️⃣  SA downloads ZIP → deploys to customer account",
    ],
    note: "Multiple requests queue and process — no bottleneck",
    accent: "#3498db",
    image: "/screenshots/10-my-requests.png",
  },
  {
    title: "Self-Healing System",
    subtitle: "Bug Fix Agent runs every hour — autonomously",
    bullets: [
      "🔍  Scans CloudWatch logs for errors, timeouts, failures",
      "🧠  AI analyzes root cause and proposes code fixes",
      "🏷️  Assigns severity: critical / high / medium / low",
      "📋  Reports to Bug Tracker dashboard with fix proposals",
      "👤  Admin reviews and marks fixed",
      "📈  Tracks bugs by version (currently v3.1.0)",
    ],
    note: "No manual log reading — the agent finds problems before users report them",
    accent: "#e74c3c",
    image: "",
  },
  {
    title: "Anti-Hallucination",
    subtitle: "Extension Skills + Eval = grounded, validated output",
    bullets: [
      "📚  Skill files per extension — correct functions, valid SQL, common mistakes",
      "🚫  Blocks made-up functions (e.g., vector_search() doesn't exist)",
      "🔁  Retry on empty — 3 attempts if Bedrock returns garbage",
      "🐍  Python AST compile — catches syntax errors before packaging",
      "☁️  CloudFormation YAML parse — validates structure",
      "🔒  Security scan — no hardcoded AWS keys or passwords",
    ],
    note: "Skills for: pgvector, PostGIS, pgRouting, pg_trgm, pg_cron, auto_explain",
    accent: "#1abc9c",
    image: "",
  },
  {
    title: "What Gets Generated",
    subtitle: "41 files per demo — zero empty",
    bullets: [
      "☁️  cloudformation/main.yaml — Full VPC + Aurora + Bastion (7KB+)",
      "🐍  app.py — Flask API with real extension endpoints (9KB+)",
      "🗄️  database/setup.sql — Schema + industry seed data",
      "📚  10 modules/ — Each with README.md + example.py (real code)",
      "🎯  demo/ — Talking points, demo script, presentation guide",
      "📖  README.md + GETTING_STARTED.md + deploy.sh",
    ],
    note: "Verified: 6/6 demos pass all checks — 0 empty files, 11/11 Python syntax pass",
    accent: "#ff9900",
    image: "",
  },
  {
    title: "6 AWS Databases",
    subtitle: "Proven with real generated demos",
    bullets: [
      "✅  Aurora PostgreSQL — pgvector RAG for healthcare (clinical trials)",
      "✅  Aurora PostgreSQL — PostGIS fleet tracking for logistics",
      "✅  Aurora PostgreSQL — pg_cron IoT pipeline for manufacturing",
      "✅  DynamoDB — Single-table e-commerce for retail",
      "✅  Neptune — Fraud detection graph for financial services",
      "✅  Aurora MySQL — Multi-tenant SaaS for technology",
    ],
    note: "Each generated, downloaded, unzipped, and verified — 41 files, 0 empty",
    accent: "#3498db",
    image: "/screenshots/09-ai-catalog.png",
  },
  {
    title: "Architecture Diagram",
    subtitle: "",
    bullets: [
      "┌─────────────┐     ┌──────────────┐     ┌─────────────────┐",
      "│  Amplify     │────▶│  CloudFront  │────▶│  ECS Fargate    │",
      "│  (React UI)  │     │  (CDN/API)   │     │  (Node.js API)  │",
      "└─────────────┘     └──────────────┘     └────────┬────────┘",
      "                                                   │",
      "              ┌────────────────┬──────────────────┬┘",
      "              ▼                ▼                  ▼",
      "    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐",
      "    │  RDS Postgres │  │   Bedrock    │  │   Cognito    │",
      "    │  (App DB)     │  │  (Opus 4.6)  │  │  (Auth)      │",
      "    └──────────────┘  └──────────────┘  └──────────────┘",
    ],
    note: "All in us-east-2 • CloudFormation deployed • Fully serverless",
    accent: "#8e44ad",
    image: "",
  },
  {
    title: "Metrics & Observability",
    subtitle: "Every generation is tracked",
    bullets: [
      "🔢  Tokens — input + output per generation (e.g., 45K tokens)",
      "⏱️  Time — wall-clock per demo (e.g., 8 min 23 sec)",
      "📊  Agent Actions — every proposal logged with status",
      "🐛  Bug Tracker — EVAL-001, BUG-001 with severity",
      "📈  Version tracking — bugs tied to app version",
      "🔔  Hourly health scans — proactive, not reactive",
    ],
    note: "Admin Dashboard → Agent Actions tab shows all metrics",
    accent: "#f39c12",
    image: "",
  },
  {
    title: "Get Started",
    subtitle: "For all AWS field SAs, TAMs, and Sales Engineers",
    bullets: [
      "1.  Sign in → Request Demo",
      "2.  Describe your customer's use case",
      "3.  Answer 5 AI questions (2 minutes)",
      "4.  Admin approves → AI generates (~10 min)",
      "5.  Download ZIP from AI Demo Catalog",
      "6.  Import to GitHub/GitLab",
      "7.  Deploy to customer account (1 command)",
    ],
    note: "Live now • v3.1.0 • 6 databases • 12+ eval checks • self-healing",
    accent: "#ff9900",
    image: "/screenshots/04-demo-request.png",
  },
];

export default function PresentationPage() {
  const [current, setCurrent] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const slide = SLIDES[current];

  useEffect(() => { setAnimKey(k => k + 1); }, [current]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); setCurrent(c => Math.min(c + 1, SLIDES.length - 1)); }
      if (e.key === "ArrowLeft") setCurrent(c => Math.max(c - 1, 0));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div style={{ background: "linear-gradient(135deg, #0a0e1a 0%, #1a1f3a 50%, #0d1117 100%)", minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Amazon Ember', -apple-system, sans-serif", overflow: "hidden" }}>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInLeft { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes glow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.7; } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        .slide-title { animation: fadeInUp 0.6s ease-out; }
        .slide-subtitle { animation: fadeInUp 0.6s ease-out 0.15s both; }
        .slide-bullet { animation: fadeInLeft 0.5s ease-out both; }
        .slide-note { animation: fadeInUp 0.5s ease-out 0.8s both; }
        .nav-btn { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 15px; transition: all 0.2s; }
        .nav-btn:hover:not(:disabled) { background: rgba(255,255,255,0.15); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        .nav-btn:disabled { opacity: 0.3; cursor: default; }
        .arch-line { font-family: 'Courier New', monospace; font-size: 16px; color: #8d99ae; line-height: 1.4; }
      `}</style>

      {/* Animated background orbs */}
      <div style={{ position: "fixed", top: "-20%", right: "-10%", width: "600px", height: "600px", borderRadius: "50%", background: `radial-gradient(circle, ${slide.accent}22 0%, transparent 70%)`, animation: "glow 4s ease-in-out infinite", transition: "background 0.8s ease", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-30%", left: "-15%", width: "500px", height: "500px", borderRadius: "50%", background: `radial-gradient(circle, ${slide.accent}11 0%, transparent 70%)`, animation: "glow 6s ease-in-out infinite 2s", pointerEvents: "none" }} />

      {/* Progress bar */}
      <div style={{ height: "3px", background: "rgba(255,255,255,0.05)" }}>
        <div style={{ height: "100%", background: `linear-gradient(90deg, ${slide.accent}, ${slide.accent}88)`, width: `${((current + 1) / SLIDES.length) * 100}%`, transition: "width 0.5s ease, background 0.5s ease" }} />
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 50px" }}>
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="nav-btn" disabled={current === 0} onClick={() => setCurrent(current - 1)}>← Prev</button>
          <button className="nav-btn" disabled={current === SLIDES.length - 1} onClick={() => setCurrent(current + 1)}>Next →</button>
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {SLIDES.map((_, i) => (
            <div key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? "20px" : "8px", height: "8px", borderRadius: "4px", background: i === current ? slide.accent : "rgba(255,255,255,0.2)", cursor: "pointer", transition: "all 0.3s ease" }} />
          ))}
        </div>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>{current + 1} / {SLIDES.length}</span>
      </div>

      {/* Slide */}
      <div key={animKey} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "20px 100px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <h1 className="slide-title" style={{ color: "#ffffff", fontSize: "52px", fontWeight: 800, margin: "0 0 8px 0", lineHeight: 1.1, letterSpacing: "-1px" }}>
          {slide.title}
        </h1>

        {slide.subtitle && (
          <h2 className="slide-subtitle" style={{ color: slide.accent, fontSize: "24px", fontWeight: 400, margin: "0 0 36px 0", opacity: 0.9 }}>
            {slide.subtitle}
          </h2>
        )}

        {slide.bullets.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {slide.bullets.map((b, i) => (
              <li key={i} className={slide.title === "Architecture Diagram" ? "arch-line" : "slide-bullet"} style={slide.title === "Architecture Diagram" ? {} : { color: "#e2e8f0", fontSize: "22px", lineHeight: 1.5, padding: "5px 0", paddingLeft: "16px", borderLeft: `3px solid ${slide.accent}44`, marginBottom: "6px", animationDelay: `${0.2 + i * 0.08}s` }}>
                {b}
              </li>
            ))}
          </ul>
        )}

        {slide.note && (
          <p className="slide-note" style={{ color: "rgba(255,255,255,0.4)", fontSize: "16px", marginTop: "32px", fontStyle: "italic" }}>
            {slide.note}
          </p>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 50px", display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "12px" }}>Cloud Demo Generator v3.1.0</span>
        <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "12px" }}>Amazon Web Services • Use ← → keys to navigate</span>
      </div>
    </div>
  );
}
