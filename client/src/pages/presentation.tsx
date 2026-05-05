import React, { useState, useEffect } from "react";

const SLIDES = [
  {
    title: "Cloud Demo Generator",
    subtitle: "AI-Powered Enablement for AWS Database Demos",
    bullets: [],
    note: "Powered by Amazon Bedrock (Claude Opus 4)",
    accent: "#ff9900",
  },
  {
    title: "The Problem",
    subtitle: "Field teams spend days building demos from scratch",
    bullets: [
      "Hours building one-off demos for each customer engagement",
      "Every demo needs infrastructure, code, data, and documentation",
      "No reuse across the field — rebuilt every single time",
      "Customers expect working, deployable examples — not slides",
    ],
    note: "",
    accent: "#e74c3c",
  },
  {
    title: "The Solution",
    subtitle: "Describe it. AI builds it.",
    bullets: [
      "Describe → \"pgvector fraud detection for fintech\"",
      "Refine → AI asks 5 clarifying questions",
      "Generate → Full package in ~10 minutes",
      "Deploy → One command to any AWS account",
    ],
    note: "Human-in-the-loop: Admin approves before generation",
    accent: "#2ecc71",
  },
  {
    title: "What Gets Generated",
    subtitle: "Complete enablement package",
    bullets: [
      "☁️  CloudFormation — VPC, database, compute, security",
      "🐍  Application — Flask API with real endpoints",
      "🗄️  Database — Schema, extensions, industry seed data",
      "📚  10 Modules — Hands-on exercises with working code",
      "🎯  Demo Materials — Talking points & demo scripts",
      "📖  Full Documentation — README, setup, Git import",
    ],
    note: "",
    accent: "#3498db",
  },
  {
    title: "Industry-Specific",
    subtitle: "Tailored to your customer's domain",
    bullets: [
      "Healthcare → Patient records, clinical trial matching",
      "Financial → Transactions, fraud detection, compliance",
      "Retail → Product catalogs, recommendations, search",
      "Manufacturing → IoT sensors, fleet tracking, routing",
      "Technology → Embeddings, RAG, multi-tenant SaaS",
    ],
    note: "AI generates domain-specific data and queries",
    accent: "#9b59b6",
  },
  {
    title: "AWS Databases",
    subtitle: "6 database engines supported",
    bullets: [
      "Aurora PostgreSQL — pgvector, PostGIS, pgRouting, any extension",
      "Aurora MySQL — JSON, full-text, spatial, replicas",
      "DynamoDB — Single-table, GSIs, streams, TTL",
      "Neptune — Knowledge graphs, Gremlin, SPARQL",
      "RDS — PostgreSQL, MySQL, Oracle, SQL Server, Db2",
      "ElastiCache / MemoryDB — Caching, pub/sub, leaderboards",
    ],
    note: "",
    accent: "#ff9900",
  },
  {
    title: "Quality Assurance",
    subtitle: "12+ automated checks on every package",
    bullets: [
      "Python AST syntax validation",
      "CloudFormation YAML structure verification",
      "SQL correctness — extensions, tables, seed data",
      "Security — no hardcoded secrets or credentials",
      "Anti-hallucination — grounded with extension skills",
      "Completeness — no empty files or placeholders",
    ],
    note: "Failures auto-reported to Bug Tracker",
    accent: "#1abc9c",
  },
  {
    title: "Architecture",
    subtitle: "Fully managed, serverless",
    bullets: [
      "React + Cloudscape → AWS Console experience",
      "ECS Fargate → No servers to manage",
      "Amazon Bedrock → Claude Opus 4 for generation",
      "Amazon Cognito → Enterprise authentication",
      "RDS PostgreSQL → Application database",
      "CloudFormation → Infrastructure as Code",
    ],
    note: "",
    accent: "#3498db",
  },
  {
    title: "Get Started Today",
    subtitle: "",
    bullets: [
      "1. Sign in",
      "2. Request Demo → describe your use case",
      "3. Answer AI's clarifying questions",
      "4. Admin approves → AI generates in ~10 min",
      "5. Download ZIP → deploy with one command",
    ],
    note: "cloud-demo-generator v3.1.0",
    accent: "#ff9900",
  },
];

export default function PresentationPage() {
  const [current, setCurrent] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const slide = SLIDES[current];

  useEffect(() => {
    setAnimKey(k => k + 1);
  }, [current]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") setCurrent(c => Math.min(c + 1, SLIDES.length - 1));
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
        @keyframes slideIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes glow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        @keyframes progressFill { from { width: 0%; } to { width: var(--progress); } }
        .slide-title { animation: fadeInUp 0.6s ease-out; }
        .slide-subtitle { animation: fadeInUp 0.6s ease-out 0.15s both; }
        .slide-bullet { animation: fadeInLeft 0.5s ease-out both; }
        .slide-note { animation: fadeInUp 0.5s ease-out 0.8s both; }
        .nav-btn { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 16px; transition: all 0.2s; }
        .nav-btn:hover:not(:disabled) { background: rgba(255,255,255,0.15); transform: translateY(-1px); }
        .nav-btn:disabled { opacity: 0.3; cursor: default; }
      `}</style>

      {/* Animated background orb */}
      <div style={{ position: "fixed", top: "-20%", right: "-10%", width: "600px", height: "600px", borderRadius: "50%", background: `radial-gradient(circle, ${slide.accent}22 0%, transparent 70%)`, animation: "glow 4s ease-in-out infinite", transition: "background 0.8s ease", pointerEvents: "none" }} />

      {/* Progress bar */}
      <div style={{ height: "3px", background: "rgba(255,255,255,0.05)", position: "relative" }}>
        <div style={{ "--progress": `${((current + 1) / SLIDES.length) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${slide.accent}, ${slide.accent}88)`, width: `${((current + 1) / SLIDES.length) * 100}%`, transition: "width 0.5s ease, background 0.5s ease" } as any} />
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 50px" }}>
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="nav-btn" disabled={current === 0} onClick={() => setCurrent(current - 1)}>← Prev</button>
          <button className="nav-btn" disabled={current === SLIDES.length - 1} onClick={() => setCurrent(current + 1)}>Next →</button>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {SLIDES.map((_, i) => (
            <div key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? "24px" : "8px", height: "8px", borderRadius: "4px", background: i === current ? slide.accent : "rgba(255,255,255,0.2)", cursor: "pointer", transition: "all 0.3s ease" }} />
          ))}
        </div>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>{current + 1} / {SLIDES.length}</span>
      </div>

      {/* Slide */}
      <div key={animKey} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 100px", maxWidth: "1100px", margin: "0 auto", width: "100%" }}>
        <h1 className="slide-title" style={{ color: "#ffffff", fontSize: "56px", fontWeight: 800, margin: "0 0 12px 0", lineHeight: 1.1, letterSpacing: "-1px" }}>
          {slide.title}
        </h1>

        {slide.subtitle && (
          <h2 className="slide-subtitle" style={{ color: slide.accent, fontSize: "26px", fontWeight: 400, margin: "0 0 48px 0", opacity: 0.9 }}>
            {slide.subtitle}
          </h2>
        )}

        {slide.bullets.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {slide.bullets.map((b, i) => (
              <li key={i} className="slide-bullet" style={{ color: "#e2e8f0", fontSize: "26px", lineHeight: 1.6, padding: "6px 0", paddingLeft: "20px", borderLeft: `3px solid ${slide.accent}33`, marginBottom: "8px", animationDelay: `${0.2 + i * 0.1}s` }}>
                {b}
              </li>
            ))}
          </ul>
        )}

        {slide.note && (
          <p className="slide-note" style={{ color: "rgba(255,255,255,0.45)", fontSize: "18px", marginTop: "48px", fontStyle: "italic" }}>
            {slide.note}
          </p>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "16px 50px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>Cloud Demo Generator v3.1.0</span>
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>Amazon Web Services</span>
      </div>
    </div>
  );
}
