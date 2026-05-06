import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/useAuth";

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  return (
    <div className="df-landing">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');
        .df-landing { font-family: 'Inter', -apple-system, sans-serif; color: #0f172a; background: #f4f6fb; }
        .df-landing *, .df-landing *::before, .df-landing *::after { box-sizing: border-box; }
        .df-landing h1, .df-landing h2, .df-landing h3 { margin: 0; letter-spacing: -0.02em; }
        .df-landing h1 { font-size: 38px; font-weight: 800; line-height: 1.15; }
        .df-landing h2 { font-size: 20px; font-weight: 700; }
        .df-landing h3 { font-size: 15px; font-weight: 700; }
        .df-landing p { margin: 0; }
        .df-content { max-width: 1440px; margin: 0 auto; padding: 32px 36px; display: flex; flex-direction: column; gap: 48px; }

        /* Hero */
        .df-hero { background: linear-gradient(135deg, #0b1020 0%, #1a1f3a 50%, #0f1735 100%); border-radius: 16px; padding: 56px 48px; display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 48px; align-items: center; position: relative; overflow: hidden; box-shadow: 0 16px 40px rgba(15,23,42,0.25); }
        .df-hero::before { content: ''; position: absolute; top: -100px; right: -100px; width: 400px; height: 400px; background: radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%); pointer-events: none; }
        .df-hero::after { content: ''; position: absolute; bottom: -80px; left: 30%; width: 300px; height: 300px; background: radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%); pointer-events: none; }
        .df-hero-left { position: relative; z-index: 1; }
        .df-hero-right { position: relative; z-index: 1; }
        .df-status-pill { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 6px 14px; font-size: 12px; color: rgba(255,255,255,0.7); margin-bottom: 20px; font-family: 'JetBrains Mono', monospace; }
        .df-pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: #34d399; animation: dfpulse 2s infinite; }
        @keyframes dfpulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.4); } 50% { box-shadow: 0 0 0 4px rgba(52,211,153,0.1); } }
        .df-hero h1 { color: #fff; font-size: 42px; margin-bottom: 16px; }
        .df-hero h1 span { background: linear-gradient(90deg, #3b82f6, #7c3aed, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .df-hero-sub { color: rgba(255,255,255,0.6); font-size: 15px; line-height: 1.6; margin-bottom: 28px; }
        .df-hero-ctas { display: flex; gap: 12px; }
        .df-btn-primary { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #3b82f6, #7c3aed); color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
        .df-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(59,130,246,0.4); }
        .df-btn-ghost { display: inline-flex; align-items: center; gap: 8px; background: transparent; color: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .df-btn-ghost:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.3); }
        .df-stats-card { background: rgba(255,255,255,0.04); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .df-stat { text-align: center; }
        .df-stat-value { font-size: 22px; font-weight: 800; color: #fff; }
        .df-stat-label { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 4px; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; }

        /* Section headers */
        .df-section-header { margin-bottom: 24px; }
        .df-section-header h2 { color: #0f172a; margin-bottom: 6px; }
        .df-section-header p { color: #5b6678; font-size: 14px; }

        /* Feature cards */
        .df-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .df-feature-card { background: #fff; border: 1px solid #e5e9f0; border-radius: 12px; padding: 24px; transition: all 0.2s ease; position: relative; overflow: hidden; }
        .df-feature-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--card-gradient); opacity: 0; transition: opacity 0.2s; }
        .df-feature-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(15,23,42,0.08); border-color: #d3d9e3; }
        .df-feature-card:hover::before { opacity: 1; }
        .df-icon-tile { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; background: var(--tile-bg); }
        .df-icon-tile svg { width: 20px; height: 20px; stroke: var(--tile-color); fill: none; stroke-width: 2; }
        .df-feature-card h3 { margin-bottom: 8px; }
        .df-feature-card p { color: #5b6678; font-size: 13px; line-height: 1.5; }

        /* Steps */
        .df-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        .df-step-card { background: #fff; border: 1px solid #e5e9f0; border-radius: 12px; padding: 24px; transition: all 0.2s ease; }
        .df-step-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(15,23,42,0.06); }
        .df-step-pill { display: inline-block; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 600; color: #2563eb; background: #eff6ff; padding: 4px 10px; border-radius: 6px; margin-bottom: 12px; }
        .df-step-card h3 { margin-bottom: 8px; }
        .df-step-card p { color: #5b6678; font-size: 13px; line-height: 1.5; }

        /* Examples */
        .df-example-card { background: #fff; border: 1px solid #e5e9f0; border-radius: 12px; padding: 24px; transition: all 0.2s ease; display: flex; flex-direction: column; gap: 12px; }
        .df-example-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(15,23,42,0.08); }
        .df-ext-badge { display: inline-block; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 6px; background: var(--badge-bg); color: var(--badge-color); }
        .df-example-card h3 { font-size: 14px; }
        .df-example-card > p { color: #5b6678; font-size: 13px; line-height: 1.5; flex: 1; }
        .df-tags { display: flex; gap: 6px; flex-wrap: wrap; }
        .df-tag { font-size: 11px; padding: 3px 8px; border-radius: 4px; background: #f7f9fc; border: 1px solid #e5e9f0; color: #5b6678; }

        /* DB cards */
        .df-db-card { display: flex; align-items: center; gap: 16px; background: #fff; border: 1px solid #e5e9f0; border-radius: 12px; padding: 18px 20px; transition: all 0.2s ease; }
        .df-db-card:hover { box-shadow: 0 4px 12px rgba(15,23,42,0.06); }
        .df-db-tile { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0; }
        .df-db-info h3 { font-size: 14px; margin-bottom: 2px; }
        .df-db-info p { color: #5b6678; font-size: 12px; }

        /* Bottom CTA */
        .df-bottom-cta { background: linear-gradient(135deg, #0b1020 0%, #1a1f3a 50%, #0f1735 100%); border-radius: 16px; padding: 48px; display: flex; align-items: center; justify-content: space-between; position: relative; overflow: hidden; }
        .df-bottom-cta::before { content: ''; position: absolute; top: -50px; right: 20%; width: 300px; height: 300px; background: radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%); pointer-events: none; }
        .df-bottom-cta h2 { color: #fff; font-size: 24px; margin-bottom: 8px; }
        .df-bottom-cta p { color: rgba(255,255,255,0.5); font-size: 14px; }
        .df-bottom-cta-btns { display: flex; gap: 12px; position: relative; z-index: 1; }
        .df-btn-outline { display: inline-flex; align-items: center; gap: 8px; background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.3); padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .df-btn-outline:hover { background: rgba(255,255,255,0.05); }

        /* Responsive */
        @media (max-width: 1100px) { .df-grid-3 { grid-template-columns: repeat(2, 1fr); } .df-grid-4 { grid-template-columns: repeat(2, 1fr); } .df-hero { grid-template-columns: 1fr; } }
        @media (max-width: 720px) { .df-grid-3 { grid-template-columns: 1fr; } .df-grid-4 { grid-template-columns: 1fr; } .df-hero { padding: 32px 24px; } .df-content { padding: 20px 16px; gap: 32px; } .df-bottom-cta { flex-direction: column; gap: 24px; text-align: center; } }
      `}</style>

      <div className="df-content">
        {/* Hero */}
        <div className="df-hero">
          <div className="df-hero-left">
            <div className="df-status-pill"><span className="df-pulse-dot"></span>AI Agent · v3.1 · Online</div>
            <h1>Build any customer demo<br/><span>with AI in minutes</span></h1>
            <p className="df-hero-sub">Describe what you need in plain English. The AI agent generates a complete enablement package — infrastructure, code, modules, and documentation — for any AWS managed database.</p>
            <div className="df-hero-ctas">
              <button className="df-btn-primary" onClick={() => navigate(user ? "/demo-request" : "/auth")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l1.5 4.5H18l-3.5 2.5L16 14.5 12 12l-4 2.5 1.5-4.5L6 7.5h4.5z"/></svg>
                Request a Demo
              </button>
              <button className="df-btn-ghost" onClick={() => navigate(user ? "/home" : "/auth")}>Browse Catalog</button>
            </div>
          </div>
          <div className="df-hero-right">
            <div className="df-stats-card">
              <div className="df-stat"><div className="df-stat-value">6+</div><div className="df-stat-label">AWS Databases</div></div>
              <div className="df-stat"><div className="df-stat-value">AI</div><div className="df-stat-label">Powered Agent</div></div>
              <div className="df-stat"><div className="df-stat-value">10+</div><div className="df-stat-label">Modules/Demo</div></div>
              <div className="df-stat"><div className="df-stat-value">1-Click</div><div className="df-stat-label">AWS Deploy</div></div>
            </div>
          </div>
        </div>

        {/* What the AI agent builds */}
        <section>
          <div className="df-section-header"><h2>What the AI agent builds</h2><p>Every generated demo includes these components — tailored to your customer's industry</p></div>
          <div className="df-grid-3">
            {[
              { title: "AWS Infrastructure", desc: "CloudFormation templates — VPC, Aurora/DynamoDB/Neptune, compute, security groups. Deploy to any account.", gradient: "linear-gradient(135deg,#3b82f6,#06b6d4)", tile: "#eff6ff", color: "#2563eb", icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999A5.002 5.002 0 003 15z" },
              { title: "Learning Modules", desc: "10+ structured hands-on exercises with working code examples. Teach customers to build, not just watch.", gradient: "linear-gradient(135deg,#7c3aed,#a855f7)", tile: "#f5f3ff", color: "#7c3aed", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
              { title: "Demo Materials", desc: "Customer talking points, step-by-step demo scripts, and presentation guides tailored to your audience.", gradient: "linear-gradient(135deg,#ef4444,#f97316)", tile: "#fef2f2", color: "#ef4444", icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
              { title: "Application Code", desc: "Flask API with real database-specific endpoints, health checks, error handling, and environment config.", gradient: "linear-gradient(135deg,#10b981,#06b6d4)", tile: "#ecfdf5", color: "#10b981", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" },
              { title: "Database Schema", desc: "Extension setup, table creation with proper types, industry-specific seed data, and versioned migrations.", gradient: "linear-gradient(135deg,#7c3aed,#ec4899)", tile: "#fdf4ff", color: "#a855f7", icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" },
              { title: "Documentation", desc: "README, Getting Started guide, Git import instructions, cleanup commands, and architecture notes.", gradient: "linear-gradient(135deg,#f97316,#eab308)", tile: "#fffbeb", color: "#f59e0b", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
            ].map((card, i) => (
              <div key={i} className="df-feature-card" style={{ "--card-gradient": card.gradient } as any}>
                <div className="df-icon-tile" style={{ "--tile-bg": card.tile, "--tile-color": card.color } as any}>
                  <svg viewBox="0 0 24 24"><path d={card.icon}/></svg>
                </div>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section>
          <div className="df-section-header"><h2>How it works</h2><p>From request to deployable demo in four steps</p></div>
          <div className="df-grid-4">
            {[
              { step: "01", title: "Describe", desc: "Tell the AI what you need — any database, any extension, any industry. Plain English." },
              { step: "02", title: "Refine", desc: "The agent asks 5 clarifying questions to understand your audience, scale, and demo goals." },
              { step: "03", title: "Generate", desc: "AI builds the full package — infra, code, modules, exercises, demo scripts. ~10 minutes." },
              { step: "04", title: "Share & Teach", desc: "Download the ZIP, share with your customer as a hands-on learning package." },
            ].map((s, i) => (
              <div key={i} className="df-step-card">
                <div className="df-step-pill">STEP {s.step}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Examples */}
        <section>
          <div className="df-section-header"><h2>Examples from the catalog</h2><p>These are just samples — you can request any database, any extension, any use case</p></div>
          <div className="df-grid-3">
            {[
              { ext: "pgvector", badge: "#eff6ff", color: "#2563eb", title: "RAG Clinical Trial Matching", desc: "Semantic search over patient records and clinical trials using vector embeddings on Aurora PostgreSQL.", tags: ["Healthcare", "AI/ML", "Embeddings"] },
              { ext: "PostGIS", badge: "#ecfdf5", color: "#10b981", title: "Fleet Tracking & Geofencing", desc: "Real-time vehicle tracking, proximity queries, and delivery zone optimization for logistics.", tags: ["Logistics", "Geospatial", "Maps"] },
              { ext: "pgRouting", badge: "#f5f3ff", color: "#7c3aed", title: "Supply Chain Route Optimization", desc: "Shortest path, traveling salesman, and vehicle routing for warehouse-to-store delivery.", tags: ["Supply Chain", "Graph", "Routing"] },
              { ext: "pg_trgm", badge: "#fffbeb", color: "#f59e0b", title: "Fuzzy Product Search", desc: "Trigram-based search with typo tolerance for e-commerce product catalogs.", tags: ["Retail", "Search", "GIN Index"] },
              { ext: "pg_cron", badge: "#fef2f2", color: "#ef4444", title: "IoT Data Pipeline", desc: "Scheduled aggregations and data lifecycle management for manufacturing sensor data.", tags: ["Manufacturing", "IoT", "Scheduling"] },
              { ext: "auto_explain", badge: "#f0f9ff", color: "#0891b2", title: "Query Performance Tuning", desc: "Automatic query plan logging and optimization patterns for DBA enablement.", tags: ["DBA", "Performance", "Observability"] },
            ].map((ex, i) => (
              <div key={i} className="df-example-card">
                <div className="df-ext-badge" style={{ "--badge-bg": ex.badge, "--badge-color": ex.color } as any}>{ex.ext}</div>
                <h3>{ex.title}</h3>
                <p>{ex.desc}</p>
                <div className="df-tags">{ex.tags.map(t => <span key={t} className="df-tag">{t}</span>)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Supported databases */}
        <section>
          <div className="df-section-header"><h2>Supported AWS databases</h2><p>Generate demos for any of these engines — or request something new</p></div>
          <div className="df-grid-3">
            {[
              { code: "PG", name: "Aurora PostgreSQL", desc: "pgvector, PostGIS, pgRouting, pg_trgm, pg_cron, and any extension", bg: "#2563eb" },
              { code: "My", name: "Aurora MySQL", desc: "JSON, full-text search, spatial indexes, read replicas", bg: "#f97316" },
              { code: "Dy", name: "Amazon DynamoDB", desc: "Single-table design, GSIs, streams, event sourcing, TTL", bg: "#7c3aed" },
              { code: "Np", name: "Amazon Neptune", desc: "Knowledge graphs, fraud detection, Gremlin, SPARQL", bg: "#06b6d4" },
              { code: "RDS", name: "Amazon RDS", desc: "PostgreSQL, MySQL, Oracle, SQL Server, Db2", bg: "#10b981" },
              { code: "EC", name: "ElastiCache / MemoryDB", desc: "Caching, pub/sub, session management, leaderboards", bg: "#ef4444" },
            ].map((db, i) => (
              <div key={i} className="df-db-card">
                <div className="df-db-tile" style={{ background: db.bg }}>{db.code}</div>
                <div className="df-db-info"><h3>{db.name}</h3><p>{db.desc}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="df-bottom-cta">
          <div style={{ position: "relative", zIndex: 1 }}>
            <h2>What demo does your customer need?</h2>
            <p>Describe it in plain English. The AI agent handles the rest.</p>
          </div>
          <div className="df-bottom-cta-btns">
            <button className="df-btn-outline" onClick={() => navigate(user ? "/home" : "/auth")}>Browse Catalog</button>
            <button className="df-btn-primary" onClick={() => navigate(user ? "/demo-request" : "/auth")}>Request a Demo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
