import React, { useState, useEffect } from "react";

const SLIDES = [
  {
    title: "DemoForge",
    subtitle: "AI-Powered Demo Enablement Platform for AWS Field Teams",
    bullets: [],
    note: "Amazon Bedrock • ECS Fargate • Aurora PostgreSQL • Cognito",
    accent: "#ff9900",
  },
  {
    title: "The Challenge",
    subtitle: "Why we built this",
    bullets: [
      "Field SAs spend 2-3 days building each customer demo from scratch",
      "No institutional knowledge — demos aren't shared or reused",
      "Customers expect working deployable code, not PowerPoint",
      "1000+ SAs × 4 demos/month = 48,000 engineering days/year wasted",
    ],
    note: "This is a scale problem. Manual demo creation doesn't scale with our field growth.",
    accent: "#e74c3c",
  },
  {
    title: "What DemoForge Does",
    subtitle: "Describe it in English → AI builds the full enablement package",
    bullets: [
      "SA describes what they need: \"pgvector fraud detection for a fintech CTO\"",
      "AI asks 5 clarifying questions to understand audience and scope",
      "AI generates a complete, deployable demo — code, infra, data, exercises",
      "SA downloads, imports to Git, deploys to customer account in 1 command",
    ],
    note: "From 2-3 days → 10 minutes. Same quality. Consistent. Reusable.",
    accent: "#2ecc71",
  },
  {
    title: "What SAs Get",
    subtitle: "A complete enablement package — not just sample code",
    bullets: [
      "CloudFormation template — deploys VPC, database, compute in one click",
      "Working application — Flask API with real database queries",
      "Industry-specific data — healthcare patients, retail products, fintech transactions",
      "10 hands-on modules — each with README and working Python example",
      "Demo script + talking points — ready to present to the customer",
      "Git-ready — import to GitHub/GitLab, deploy, present same day",
    ],
    note: "This teaches customers how to build — it's enablement, not a handoff.",
    accent: "#3498db",
  },
  {
    title: "Two AI Agents",
    subtitle: "Autonomous but supervised — human approves every action",
    bullets: [
      "🤖 Demo Generation Agent",
      "    Receives requests → asks questions → generates spec → builds template",
      "    Uses extension skill files to prevent hallucination",
      "",
      "🔧 Self-Healing Agent",
      "    Scans production logs every hour for errors and failures",
      "    Proposes fixes with root cause analysis and severity rating",
      "    Ensures the platform stays healthy without manual monitoring",
    ],
    note: "Both agents propose actions. A human admin approves before execution.",
    accent: "#9b59b6",
  },
  {
    title: "How Requests Flow",
    subtitle: "Built for 1000+ concurrent users",
    bullets: [
      "1.  SA submits request (any database, any use case, any industry)",
      "2.  AI generates clarifying questions — 30 seconds",
      "3.  SA answers — AI generates full technical spec — 90 seconds",
      "4.  Request enters approval queue — admin reviews spec",
      "5.  Admin approves → AI generates in parallel — ~10 minutes",
      "6.  Automated eval validates output (12+ checks)",
      "7.  Demo appears in shared catalog — any SA can download",
    ],
    note: "Duplicate detection: if a matching demo exists, SA is redirected to download it.",
    accent: "#f39c12",
  },
  {
    title: "Quality & Trust",
    subtitle: "Every generated demo is validated before delivery",
    bullets: [
      "Python syntax — AST compilation catches errors before packaging",
      "Infrastructure — CloudFormation YAML parsed and structure verified",
      "Security — scanned for hardcoded credentials and secrets",
      "Correctness — extension skill files prevent hallucinated functions",
      "Completeness — no empty files, no placeholder content",
      "Retry logic — if AI returns garbage, system retries up to 3 times",
    ],
    note: "If validation fails, issues are auto-reported to the Bug Tracker with severity.",
    accent: "#1abc9c",
  },
  {
    title: "Self-Healing",
    subtitle: "The platform monitors itself — no on-call needed",
    bullets: [
      "Every hour, the Bug Fix Agent scans CloudWatch logs",
      "It identifies recurring errors, timeouts, and failures",
      "AI analyzes root cause and proposes specific code fixes",
      "Each bug gets an ID (BUG-001), severity, and affected file",
      "Admin reviews proposals and marks resolved",
    ],
    note: "Why hourly? Because field SAs use this globally across time zones. Issues must be caught before the next user hits them.",
    accent: "#e74c3c",
  },
  {
    title: "Architecture",
    subtitle: "",
    bullets: [],
    note: "All services in us-east-2 • Deployed via CloudFormation • Fully serverless",
    accent: "#8e44ad",
    isSvg: true,
  },
  {
    title: "Impact for Leadership",
    subtitle: "What this means at L8+ level",
    bullets: [
      "📉  Cost reduction — 48K engineering days/year → near zero marginal cost",
      "⚡  Speed to customer — demo ready same day as request, not next week",
      "📊  Consistency — every SA delivers the same quality, regardless of tenure",
      "🔄  Institutional memory — demos are cataloged and reused across the field",
      "📈  Scale — supports 1000+ SAs without additional headcount",
      "🛡️  Quality — automated eval ensures nothing broken reaches customers",
    ],
    note: "This is infrastructure for the field — like CRM but for technical enablement.",
    accent: "#ff9900",
  },
  {
    title: "What's Next",
    subtitle: "Roadmap",
    bullets: [
      "Deploy to production for all AWS field SAs globally",
      "Add remaining database engines (DocumentDB, Keyspaces, QLDB)",
      "Customer-facing mode — let customers self-serve demos",
      "Integration with Workshop Studio for guided labs",
      "Feedback loop — track which demos lead to closed deals",
    ],
    note: "",
    accent: "#3498db",
  },
  {
    title: "Try It Now",
    subtitle: "",
    bullets: [
      "1.  Sign in",
      "2.  Request Demo → describe your use case",
      "3.  Answer 5 questions (2 minutes)",
      "4.  Admin approves → AI generates (~10 min)",
      "5.  Download → deploy → present to customer",
    ],
    note: "DemoForge v3.1.0 • 6 databases • 12+ eval checks • self-healing • live now",
    accent: "#ff9900",
  },
];

function ArchDiagram() {
  return (
    <svg viewBox="0 0 900 480" style={{ width: "100%", maxWidth: "900px", animation: "fadeInUp 0.8s ease-out" }}>
      <defs>
        <linearGradient id="g-user" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#4a90d9" /><stop offset="100%" stopColor="#357abd" /></linearGradient>
        <linearGradient id="g-amplify" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ff9900" /><stop offset="100%" stopColor="#e88600" /></linearGradient>
        <linearGradient id="g-cf" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#7c3aed" /></linearGradient>
        <linearGradient id="g-ecs" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f97316" /><stop offset="100%" stopColor="#ea580c" /></linearGradient>
        <linearGradient id="g-rds" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#2563eb" /></linearGradient>
        <linearGradient id="g-bedrock" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#059669" /></linearGradient>
        <linearGradient id="g-cognito" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ec4899" /><stop offset="100%" stopColor="#db2777" /></linearGradient>
        <linearGradient id="g-cw" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#06b6d4" /><stop offset="100%" stopColor="#0891b2" /></linearGradient>
        <filter id="sh"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" /></filter>
        <marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#64748b" /></marker>
      </defs>
      <path d="M130,90 L220,90" stroke="#64748b" strokeWidth="2" markerEnd="url(#arr)" strokeDasharray="4,3" />
      <path d="M380,90 L470,90" stroke="#64748b" strokeWidth="2" markerEnd="url(#arr)" strokeDasharray="4,3" />
      <path d="M630,90 L720,90" stroke="#64748b" strokeWidth="2" markerEnd="url(#arr)" strokeDasharray="4,3" />
      <path d="M560,130 L560,200 L200,200 L200,250" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arr)" strokeDasharray="4,3" />
      <path d="M560,130 L560,250" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arr)" strokeDasharray="4,3" />
      <path d="M560,130 L560,200 L780,200 L780,250" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arr)" strokeDasharray="4,3" />
      <path d="M560,340 L560,380 L380,380 L380,410" stroke="#ef4444" strokeWidth="1.5" markerEnd="url(#arr)" strokeDasharray="4,3" />
      <g filter="url(#sh)"><rect x="40" y="60" width="90" height="60" rx="8" fill="url(#g-user)" /><text x="85" y="87" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">👤 Field SA</text><text x="85" y="104" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9">Browser</text></g>
      <g filter="url(#sh)"><rect x="220" y="60" width="160" height="60" rx="8" fill="url(#g-amplify)" /><text x="300" y="85" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">AWS Amplify</text><text x="300" y="102" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9">React + Cloudscape</text></g>
      <g filter="url(#sh)"><rect x="470" y="60" width="160" height="60" rx="8" fill="url(#g-cf)" /><text x="550" y="85" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">CloudFront + ALB</text><text x="550" y="102" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9">CDN + Load Balancer</text></g>
      <g filter="url(#sh)"><rect x="720" y="60" width="160" height="60" rx="8" fill="url(#g-ecs)" /><text x="800" y="85" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">ECS Fargate</text><text x="800" y="102" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9">Node.js API + Agents</text></g>
      <g filter="url(#sh)"><rect x="120" y="250" width="160" height="80" rx="8" fill="url(#g-rds)" /><text x="200" y="280" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Amazon RDS</text><text x="200" y="297" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9">PostgreSQL 16</text><text x="200" y="314" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="8">Requests • Specs • Repos</text></g>
      <g filter="url(#sh)"><rect x="400" y="250" width="200" height="80" rx="8" fill="url(#g-bedrock)" /><text x="500" y="275" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Amazon Bedrock</text><text x="500" y="295" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9">Claude Opus 4</text><text x="500" y="312" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="8">Demo Agent + Bug Fix Agent</text></g>
      <g filter="url(#sh)"><rect x="700" y="250" width="160" height="80" rx="8" fill="url(#g-cognito)" /><text x="780" y="280" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Amazon Cognito</text><text x="780" y="297" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9">Authentication</text><text x="780" y="314" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="8">Admin + SA roles</text></g>
      <g filter="url(#sh)"><rect x="300" y="400" width="160" height="60" rx="8" fill="url(#g-cw)" /><text x="380" y="425" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">CloudWatch</text><text x="380" y="442" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9">Hourly self-healing scan</text></g>
      <text x="175" y="50" textAnchor="middle" fill="#94a3b8" fontSize="9">HTTPS</text>
      <text x="425" y="50" textAnchor="middle" fill="#94a3b8" fontSize="9">TLS</text>
      <text x="675" y="50" textAnchor="middle" fill="#94a3b8" fontSize="9">Private VPC</text>
      <text x="470" y="395" textAnchor="middle" fill="#ef4444" fontSize="9">Self-healing loop</text>
    </svg>
  );
}

export default function PresentationPage() {
  const [current, setCurrent] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const slide = SLIDES[current] as any;

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
        .slide-title { animation: fadeInUp 0.6s ease-out; }
        .slide-subtitle { animation: fadeInUp 0.6s ease-out 0.15s both; }
        .slide-bullet { animation: fadeInLeft 0.5s ease-out both; }
        .slide-note { animation: fadeInUp 0.5s ease-out 0.8s both; }
        .nav-btn { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 15px; transition: all 0.2s; }
        .nav-btn:hover:not(:disabled) { background: rgba(255,255,255,0.15); transform: translateY(-1px); }
        .nav-btn:disabled { opacity: 0.3; cursor: default; }
      `}</style>
      <div style={{ position: "fixed", top: "-20%", right: "-10%", width: "600px", height: "600px", borderRadius: "50%", background: `radial-gradient(circle, ${slide.accent}22 0%, transparent 70%)`, animation: "glow 4s ease-in-out infinite", transition: "background 0.8s ease", pointerEvents: "none" }} />
      <div style={{ height: "3px", background: "rgba(255,255,255,0.05)" }}><div style={{ height: "100%", background: `linear-gradient(90deg, ${slide.accent}, ${slide.accent}88)`, width: `${((current + 1) / SLIDES.length) * 100}%`, transition: "width 0.5s ease" }} /></div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 50px" }}>
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="nav-btn" disabled={current === 0} onClick={() => setCurrent(current - 1)}>← Prev</button>
          <button className="nav-btn" disabled={current === SLIDES.length - 1} onClick={() => setCurrent(current + 1)}>Next →</button>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>{SLIDES.map((_, i) => (<div key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? "20px" : "8px", height: "8px", borderRadius: "4px", background: i === current ? slide.accent : "rgba(255,255,255,0.2)", cursor: "pointer", transition: "all 0.3s" }} />))}</div>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>{current + 1} / {SLIDES.length}</span>
      </div>
      <div key={animKey} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "20px 100px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <h1 className="slide-title" style={{ color: "#ffffff", fontSize: "52px", fontWeight: 800, margin: "0 0 8px 0", lineHeight: 1.1, letterSpacing: "-1px" }}>{slide.title}</h1>
        {slide.subtitle && <h2 className="slide-subtitle" style={{ color: slide.accent, fontSize: "24px", fontWeight: 400, margin: "0 0 36px 0" }}>{slide.subtitle}</h2>}
        {slide.bullets.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {slide.bullets.map((b: string, i: number) => (
              <li key={i} className="slide-bullet" style={{ color: b.startsWith("    ") ? "rgba(255,255,255,0.6)" : "#e2e8f0", fontSize: b.startsWith("    ") ? "20px" : "22px", lineHeight: 1.5, padding: b === "" ? "8px 0" : "5px 0", paddingLeft: b.startsWith("    ") ? "32px" : "16px", borderLeft: b === "" || b.startsWith("    ") ? "none" : `3px solid ${slide.accent}44`, marginBottom: "4px", animationDelay: `${0.2 + i * 0.08}s` }}>{b}</li>
            ))}
          </ul>
        )}
        {slide.isSvg && <ArchDiagram />}
        {slide.note && <p className="slide-note" style={{ color: "rgba(255,255,255,0.4)", fontSize: "16px", marginTop: "32px", fontStyle: "italic", borderLeft: `2px solid ${slide.accent}44`, paddingLeft: "12px" }}>{slide.note}</p>}
      </div>
      <div style={{ padding: "12px 50px", display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "12px" }}>DemoForge v3.1.0</span>
        <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "12px" }}>Amazon Web Services • ← → to navigate</span>
      </div>
    </div>
  );
}
